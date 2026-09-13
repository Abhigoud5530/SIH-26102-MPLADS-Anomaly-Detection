import requests
import json
import pandas as pd


# ==========================================
# MPLADS API CONFIGURATION
# ==========================================

URL = "https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getTilesReportData"

COMBO = "2,4,3042292,2"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}


# ==========================================
# DATASETS WE WANT
# ==========================================

DATASETS = {
    "recommended": "Works Recommended",
    "sanctioned": "Works Sanctioned",
    "completed": "Works Completed",
    "expenditure": "Expenditure on Completed and On-going Works as on Date"
}


# ==========================================
# FUNCTION TO FETCH DATA
# ==========================================

def fetch_dataset(dataset_name, api_key):

    payload = {
        "combo": COMBO,
        "key": api_key
    }

    print(f"\nFetching: {dataset_name}...")

    response = requests.post(
        URL,
        json=payload,
        headers=HEADERS,
        timeout=30
    )

    print("Status code:", response.status_code)

    response.raise_for_status()

    # Convert API response into Python dictionary
    response_data = response.json()

    # The API returns the actual records as a JSON string
    json_string = next(iter(response_data.values()))

    records = json.loads(json_string)

    # Convert records into Pandas DataFrame
    df = pd.DataFrame(records)

    print("Number of records:", len(df))
    print("Number of columns:", len(df.columns))

    return df


# ==========================================
# MAIN PROGRAM
# ==========================================

if __name__ == "__main__":

    for filename, api_key in DATASETS.items():

        df = fetch_dataset(filename, api_key)

        # Save dataset
        output_file = f"{filename}.csv"

        df.to_csv(
            output_file,
            index=False,
            encoding="utf-8-sig"
        )

        print("Saved:", output_file)

        print("Columns:")
        print(list(df.columns))