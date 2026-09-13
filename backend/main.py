from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import pandas as pd
from typing import Optional

from .ml_pipeline import run_pipeline


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="MPLADS Anomaly Detection API",
    description=(
        "AI-assisted anomaly detection and "
        "investigation-support system for MPLADS projects."
    ),
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HELPER FUNCTION
# Convert Pandas / NumPy values into JSON-safe values
# ============================================================

def clean_value(value):

    # Pandas / NumPy missing values
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    # Convert NumPy scalar values to normal Python values
    if hasattr(value, "item"):
        try:
            value = value.item()
        except (ValueError, AttributeError):
            pass

    return value


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "MPLADS Anomaly Detection Backend",
        "status": "running"
    }


# ============================================================
# MPLADS FILTER DATA
# STATES
# ============================================================

@app.get("/states")
def get_states():

    url = (
        "https://mplads.mospi.gov.in/"
        "rest/PreLoginDashboardData/getStateData"
    )

    try:

        response = requests.post(
            url,
            json={},
            timeout=30
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=502,
            detail=f"Unable to connect to MPLADS: {str(e)}"
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch state data from MPLADS"
        )

    return response.json()


# ============================================================
# MPLADS FILTER DATA
# CONSTITUENCIES BY STATE
# ============================================================

@app.get("/constituencies/{state_id}")
def get_constituencies(state_id: int):

    url = (
        "https://mplads.mospi.gov.in/"
        "rest/PreLoginDashboardData/getConstituencyData"
    )

    try:

        response = requests.post(
            url,
            json={
                "id": str(state_id)
            },
            timeout=30
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=502,
            detail=f"Unable to connect to MPLADS: {str(e)}"
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch constituency data from MPLADS"
        )

    return response.json()


# ============================================================
# MPLADS FILTER DATA
# MPs BY CONSTITUENCY
# ============================================================

@app.get("/mps/{state_id}/{constituency_id}")
def get_mps(
    state_id: int,
    constituency_id: int
):
    """
    Canonical route:
        /mps/{state_id}/{constituency_id}

    The state is deliberately first so the frontend cannot accidentally
    mix a constituency from one state with an MP from another state.
    """

    url = (
        "https://mplads.mospi.gov.in/"
        "rest/PreLoginDashboardData/getMpAndConstCombo"
    )

    try:
        response = requests.post(
            url,
            json={
                "const_combo": f"{constituency_id},{state_id},"
            },
            timeout=30
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to connect to MPLADS: {str(e)}"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch MP data from MPLADS"
        )

    return response.json()


# ============================================================
# LIVE FILTERED PROJECT ANALYSIS
# ============================================================

@app.get("/projects")
def get_projects(
    state_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    mp_id: Optional[int] = None,
    house_id: int = 2,
):
    """
    Return analyzed projects.

    Without filters, this preserves the original local 37-project dataset.
    With State + Constituency + MP, the backend fetches the corresponding
    live MPLADS records and runs the same ML/rule/peer pipeline on them.
    """

    try:
        projects = run_pipeline(
            state_id=state_id,
            constituency_id=constituency_id,
            mp_id=mp_id,
            house_id=house_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch live MPLADS project data: {str(e)}"
        )

    results = []

    for _, row in projects.iterrows():
        results.append({
            "project_id": clean_value(row["WORK_RECOMMENDATION_DTL_ID"]),
            "activity_type": clean_value(row["ACTIVITY_TYPE"]),
            "sanction_amount": clean_value(row["SANCTION_AMOUNT"]),
            "total_expenditure": clean_value(row["total_expenditure"]),
            "anomaly_score": clean_value(row["anomaly_score_100"]),
            "peer_average_amount": clean_value(row["peer_average_amount"]),
            "peer_deviation_pct": clean_value(row["peer_amount_deviation_pct"]),
            "vendor_name": clean_value(row["VENDOR_NAME"]),
            "vendor_project_count": clean_value(row["vendor_project_count"]),
            "similarity_pct": clean_value(row["max_project_similarity_pct"]),
            "potential_duplicate": clean_value(row["potential_duplicate"]),
            "final_risk_score": clean_value(row["final_risk_score"]),
            "risk_level": clean_value(row["risk_level"]),
            "data_confidence_pct": clean_value(row["data_confidence_pct"]),
            "risk_reasons": clean_value(row["risk_reasons"]),
        })

    return {
        "total_projects": len(results),
        "projects": results,
        "filters": {
            "state_id": state_id,
            "constituency_id": constituency_id,
            "mp_id": mp_id,
            "house_id": house_id,
            "live_data": all(
                value is not None
                for value in (state_id, constituency_id, mp_id)
            ),
        },
    }


# ============================================================
# GET SINGLE PROJECT
# ============================================================

@app.get("/projects/{project_id}")
def get_project(
    project_id: float,
    state_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    mp_id: Optional[int] = None,
    house_id: int = 2,
):

    try:
        projects = run_pipeline(
            state_id=state_id,
            constituency_id=constituency_id,
            mp_id=mp_id,
            house_id=house_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch live MPLADS project data: {str(e)}"
        )

    project = projects[
        projects[
            "WORK_RECOMMENDATION_DTL_ID"
        ] == project_id
    ]

    if project.empty:

        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    row = project.iloc[0]

    return {

        "project_id": clean_value(
            row[
                "WORK_RECOMMENDATION_DTL_ID"
            ]
        ),

        "activity_type": clean_value(
            row[
                "ACTIVITY_TYPE"
            ]
        ),

        "work_description": clean_value(
            row[
                "WORK_DESCRIPTION"
            ]
        ),

        "sanction_amount": clean_value(
            row[
                "SANCTION_AMOUNT"
            ]
        ),

        "actual_amount": clean_value(
            row[
                "ACTUAL_AMOUNT"
            ]
        ),

        "total_expenditure": clean_value(
            row[
                "total_expenditure"
            ]
        ),

        "anomaly_score": clean_value(
            row[
                "anomaly_score_100"
            ]
        ),

        "peer_average_amount": clean_value(
            row[
                "peer_average_amount"
            ]
        ),

        "peer_deviation_pct": clean_value(
            row[
                "peer_amount_deviation_pct"
            ]
        ),

        "vendor_name": clean_value(
            row[
                "VENDOR_NAME"
            ]
        ),

        "vendor_project_count": clean_value(
            row[
                "vendor_project_count"
            ]
        ),

        "similarity_pct": clean_value(
            row[
                "max_project_similarity_pct"
            ]
        ),

        "similar_project_id": clean_value(
            row[
                "similar_project_id"
            ]
        ),

        "potential_duplicate": clean_value(
            row[
                "potential_duplicate"
            ]
        ),

        "rule_risk_score": clean_value(
            row[
                "rule_risk_score"
            ]
        ),

        "ml_risk_component": clean_value(
            row[
                "ml_risk_component"
            ]
        ),

        "peer_risk_component": clean_value(
            row[
                "peer_risk_component"
            ]
        ),

        "final_risk_score": clean_value(
            row[
                "final_risk_score"
            ]
        ),

        "risk_level": clean_value(
            row[
                "risk_level"
            ]
        ),

        "data_confidence_pct": clean_value(
            row[
                "data_confidence_pct"
            ]
        ),

        "risk_reasons": clean_value(
            row[
                "risk_reasons"
            ]
        )
    }


# ============================================================
# HIGH-RISK PROJECTS
# ============================================================

@app.get("/high-risk")
def get_high_risk_projects(
    state_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    mp_id: Optional[int] = None,
    house_id: int = 2,
):

    try:
        projects = run_pipeline(
            state_id=state_id,
            constituency_id=constituency_id,
            mp_id=mp_id,
            house_id=house_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch live MPLADS project data: {str(e)}"
        )

    high_risk = projects[
        projects[
            "risk_level"
        ].isin(
            [
                "High",
                "Critical Review"
            ]
        )
    ]

    results = []

    for _, row in high_risk.iterrows():

        results.append({

            "project_id": clean_value(
                row[
                    "WORK_RECOMMENDATION_DTL_ID"
                ]
            ),

            "activity_type": clean_value(
                row[
                    "ACTIVITY_TYPE"
                ]
            ),

            "sanction_amount": clean_value(
                row[
                    "SANCTION_AMOUNT"
                ]
            ),

            "final_risk_score": clean_value(
                row[
                    "final_risk_score"
                ]
            ),

            "risk_level": clean_value(
                row[
                    "risk_level"
                ]
            ),

            "data_confidence_pct": clean_value(
                row[
                    "data_confidence_pct"
                ]
            ),

            "risk_reasons": clean_value(
                row[
                    "risk_reasons"
                ]
            )
        })

    return {

        "total_high_risk_projects": len(results),

        "projects": results

    }


# ============================================================
# RISK SUMMARY
# ============================================================

@app.get("/risk-summary")
def get_risk_summary(
    state_id: Optional[int] = None,
    constituency_id: Optional[int] = None,
    mp_id: Optional[int] = None,
    house_id: int = 2,
):

    try:
        projects = run_pipeline(
            state_id=state_id,
            constituency_id=constituency_id,
            mp_id=mp_id,
            house_id=house_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch live MPLADS project data: {str(e)}"
        )

    counts = (
        projects[
            "risk_level"
        ]
        .value_counts()
        .to_dict()
    )

    return {

        "total_projects": len(projects),

        "critical_review": int(
            counts.get(
                "Critical Review",
                0
            )
        ),

        "high": int(
            counts.get(
                "High",
                0
            )
        ),

        "medium": int(
            counts.get(
                "Medium",
                0
            )
        ),

        "low": int(
            counts.get(
                "Low",
                0
            )
        )
    }