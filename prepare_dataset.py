import pandas as pd
import numpy as np

from difflib import SequenceMatcher


# ============================================================
# 1. LOAD DATA
# ============================================================

recommended = pd.read_csv("recommended.csv")
sanctioned = pd.read_csv("sanctioned.csv")
completed = pd.read_csv("completed.csv")
expenditure = pd.read_csv("expenditure.csv")

print("Recommended:", len(recommended))
print("Sanctioned:", len(sanctioned))
print("Completed:", len(completed))
print("Expenditure:", len(expenditure))


# ============================================================
# 2. REMOVE INVALID PROJECT RECORDS
# ============================================================

projects = recommended.copy()

projects = projects[
    projects["WORK_RECOMMENDATION_DTL_ID"].notna()
].copy()

print("Valid projects:", len(projects))


# ============================================================
# 3. PREPARE EXPENDITURE DATA
# ============================================================

expenditure["EXPENDITURE_DATE"] = pd.to_datetime(
    expenditure["EXPENDITURE_DATE"],
    errors="coerce"
)

expenditure["FUND_DISBURSED_AMT"] = pd.to_numeric(
    expenditure["FUND_DISBURSED_AMT"],
    errors="coerce"
)


expenditure_summary = (
    expenditure
    .groupby("WORK_RECOMMENDATION_DTL_ID")
    .agg(
        total_expenditure=("FUND_DISBURSED_AMT", "sum"),
        payment_count=("FUND_DISBURSED_AMT", "count"),
        first_payment_date=("EXPENDITURE_DATE", "min"),
        last_payment_date=("EXPENDITURE_DATE", "max")
    )
    .reset_index()
)


print("\nExpenditure summary:")
print(expenditure_summary)


# ============================================================
# 4. CREATE UNIFIED PROJECT DATASET
# ============================================================

projects = projects.merge(
    sanctioned[
        [
            "WORK_RECOMMENDATION_DTL_ID",
            "SANCTION_AMOUNT",
            "SANCTION_DATE"
        ]
    ],
    on="WORK_RECOMMENDATION_DTL_ID",
    how="left",
    suffixes=("", "_sanctioned")
)


projects = projects.merge(
    completed[
        [
            "WORK_RECOMMENDATION_DTL_ID",
            "ACTUAL_AMOUNT",
            "ACTUAL_END_DATE",
            "AVERAGE_RATING"
        ]
    ],
    on="WORK_RECOMMENDATION_DTL_ID",
    how="left"
)


projects = projects.merge(
    expenditure_summary,
    on="WORK_RECOMMENDATION_DTL_ID",
    how="left"
)


print("\n==========================================")
print("UNIFIED PROJECT DATASET")
print("==========================================")

print(
    "Number of projects:",
    len(projects)
)

print(
    "Number of columns:",
    len(projects.columns)
)


# ============================================================
# 5. BASIC DATA CLEANING
# ============================================================

amount_columns = [
    "RECOMMENDED_AMOUNT",
    "SANCTION_AMOUNT",
    "ACTUAL_AMOUNT",
    "total_expenditure"
]


for col in amount_columns:

    if col in projects.columns:

        projects[col] = pd.to_numeric(
            projects[col],
            errors="coerce"
        )


date_columns = [
    "RECOMMENDATION_DATE",
    "SANCTION_DATE",
    "ACTUAL_END_DATE",
    "first_payment_date",
    "last_payment_date"
]


for col in date_columns:

    if col in projects.columns:

        projects[col] = pd.to_datetime(
            projects[col],
            errors="coerce"
        )


print("\nData cleaning completed.")


# ============================================================
# 6. FEATURE ENGINEERING
# ============================================================

projects["expenditure_ratio"] = (
    projects["total_expenditure"]
    / projects["SANCTION_AMOUNT"]
)


projects["amount_difference"] = (
    projects["SANCTION_AMOUNT"]
    - projects["total_expenditure"]
)


projects["recommendation_to_sanction_days"] = (
    projects["SANCTION_DATE"]
    - projects["RECOMMENDATION_DATE"]
).dt.days


projects["sanction_to_payment_days"] = (
    projects["first_payment_date"]
    - projects["SANCTION_DATE"]
).dt.days


projects["sanction_to_completion_days"] = (
    projects["ACTUAL_END_DATE"]
    - projects["SANCTION_DATE"]
).dt.days


projects["payment_duration_days"] = (
    projects["last_payment_date"]
    - projects["first_payment_date"]
).dt.days


projects["actual_amount_difference"] = (
    projects["SANCTION_AMOUNT"]
    - projects["ACTUAL_AMOUNT"]
)


print("\nAdditional features created.")


# ============================================================
# 7. DATA COMPLETENESS / CONFIDENCE
# ============================================================

important_fields = [
    "SANCTION_AMOUNT",
    "SANCTION_DATE",
    "ACTUAL_AMOUNT",
    "ACTUAL_END_DATE",
    "total_expenditure",
    "first_payment_date",
    "last_payment_date"
]


projects["data_completeness"] = (
    projects[important_fields]
    .notna()
    .mean(axis=1)
)


projects["data_confidence_pct"] = (
    projects["data_completeness"]
    * 100
)


# ============================================================
# 8. CUSTOM ISOLATION FOREST
# ============================================================

ml_features = [
    "RECOMMENDED_AMOUNT",
    "SANCTION_AMOUNT",
    "total_expenditure",
    "payment_count",
    "expenditure_ratio",
    "amount_difference",
    "recommendation_to_sanction_days",
    "sanction_to_payment_days",
    "sanction_to_completion_days",
    "payment_duration_days",
    "actual_amount_difference",
    "data_completeness"
]


X = projects[ml_features].copy()


X = X.replace(
    [np.inf, -np.inf],
    np.nan
)


X = X.fillna(
    X.median(numeric_only=True)
)


X = X.fillna(0)


X = X.to_numpy(dtype=float)


# ============================================================
# ISOLATION TREE
# ============================================================

class IsolationTree:

    def __init__(
        self,
        max_depth=8,
        random_state=42
    ):

        self.max_depth = max_depth
        self.random_state = random_state
        self.tree = None


    def build_tree(
        self,
        X,
        depth=0
    ):

        n_samples, n_features = X.shape


        if (
            depth >= self.max_depth
            or n_samples <= 1
        ):

            return {
                "leaf": True,
                "size": n_samples
            }


        rng = np.random.default_rng(
            self.random_state + depth + n_samples
        )


        feature = rng.integers(
            0,
            n_features
        )


        values = X[:, feature]


        min_value = values.min()
        max_value = values.max()


        if min_value == max_value:

            return {
                "leaf": True,
                "size": n_samples
            }


        split = rng.uniform(
            min_value,
            max_value
        )


        left_mask = (
            values < split
        )


        right_mask = (
            ~left_mask
        )


        if (
            left_mask.sum() == 0
            or right_mask.sum() == 0
        ):

            return {
                "leaf": True,
                "size": n_samples
            }


        return {

            "leaf": False,

            "feature": feature,

            "split": split,

            "left": self.build_tree(
                X[left_mask],
                depth + 1
            ),

            "right": self.build_tree(
                X[right_mask],
                depth + 1
            )
        }


    def fit(self, X):

        self.tree = self.build_tree(X)

        return self


    def path_length(
        self,
        sample,
        node,
        depth=0
    ):

        if node["leaf"]:

            return depth


        if (
            sample[node["feature"]]
            < node["split"]
        ):

            return self.path_length(
                sample,
                node["left"],
                depth + 1
            )


        return self.path_length(
            sample,
            node["right"],
            depth + 1
        )


# ============================================================
# BUILD ISOLATION FOREST
# ============================================================

n_trees = 100

trees = []


for i in range(n_trees):

    tree = IsolationTree(
        max_depth=8,
        random_state=i
    )

    tree.fit(X)

    trees.append(tree)


# ============================================================
# CALCULATE PATH LENGTHS
# ============================================================

path_lengths = []


for sample in X:

    lengths = []


    for tree in trees:

        length = tree.path_length(
            sample,
            tree.tree
        )

        lengths.append(length)


    path_lengths.append(
        np.mean(lengths)
    )


path_lengths = np.array(
    path_lengths
)


# ============================================================
# NORMALIZATION CONSTANT
# ============================================================

n = len(X)


if n > 2:

    c_n = (
        2
        * (
            np.log(n - 1)
            + 0.5772156649
        )
        - (
            2 * (n - 1) / n
        )
    )

else:

    c_n = 1


# ============================================================
# ANOMALY SCORE
# ============================================================

anomaly_scores = (
    2 ** (
        -path_lengths / c_n
    )
)


projects["anomaly_score"] = (
    anomaly_scores
)


projects["anomaly_score_100"] = (
    projects["anomaly_score"]
    * 100
)


# ============================================================
# ANOMALY PREDICTION
# ============================================================

threshold = np.percentile(
    anomaly_scores,
    90
)


projects["anomaly_prediction"] = np.where(
    projects["anomaly_score"]
    >= threshold,
    -1,
    1
)


print("\n==========================================")
print("ISOLATION FOREST RESULTS")
print("==========================================")


print(
    projects[
        [
            "WORK_RECOMMENDATION_DTL_ID",
            "anomaly_prediction",
            "anomaly_score_100"
        ]
    ]
    .sort_values(
        "anomaly_score_100",
        ascending=False
    )
    .head(10)
    .to_string(index=False)
)


# ============================================================
# 9. PEER COMPARISON
# ============================================================

projects["ACTIVITY_TYPE"] = (
    projects["ACTIVITY_NAME"]
    .astype(str)
    .str.extract(
        r"/\d{4}-\d{4}/\d+-(.*)$"
    )[0]
    .str.strip()
)


peer_columns = [
    "WORK_CATEGORY",
    "ACTIVITY_TYPE"
]


group_total = (
    projects
    .groupby(peer_columns)["SANCTION_AMOUNT"]
    .transform("sum")
)


group_count = (
    projects
    .groupby(peer_columns)["SANCTION_AMOUNT"]
    .transform("count")
)


projects["peer_count"] = (
    group_count - 1
)


projects["peer_average_amount"] = (
    group_total
    - projects["SANCTION_AMOUNT"]
) / projects["peer_count"]


projects.loc[
    projects["peer_count"] <= 0,
    "peer_average_amount"
] = np.nan


projects["peer_amount_difference"] = (
    projects["SANCTION_AMOUNT"]
    - projects["peer_average_amount"]
)


projects["peer_amount_deviation_pct"] = (
    projects["peer_amount_difference"]
    / projects["peer_average_amount"]
) * 100


print("\n==========================================")
print("PEER COMPARISON")
print("==========================================")


print(
    projects[
        [
            "WORK_RECOMMENDATION_DTL_ID",
            "ACTIVITY_TYPE",
            "SANCTION_AMOUNT",
            "peer_average_amount",
            "peer_count",
            "peer_amount_difference",
            "peer_amount_deviation_pct"
        ]
    ]
    .head(15)
    .to_string(index=False)
)


# ============================================================
# 10. VENDOR / PAYMENT PATTERN ANALYSIS
# ============================================================

print("\n==========================================")
print("VENDOR / PAYMENT ANALYSIS")
print("==========================================")


vendor_data = expenditure[
    expenditure["VENDOR_NAME"].notna()
].copy()


if len(vendor_data) > 0:

    # --------------------------------------------------------
    # Vendor statistics
    # --------------------------------------------------------

    vendor_project_count = (
        vendor_data
        .groupby("VENDOR_NAME")
        ["WORK_RECOMMENDATION_DTL_ID"]
        .nunique()
        .rename(
            "vendor_project_count"
        )
    )


    vendor_total_expenditure = (
        vendor_data
        .groupby("VENDOR_NAME")
        ["FUND_DISBURSED_AMT"]
        .sum()
        .rename(
            "vendor_total_expenditure"
        )
    )


    vendor_payment_count = (
        vendor_data
        .groupby("VENDOR_NAME")
        ["FUND_DISBURSED_AMT"]
        .count()
        .rename(
            "vendor_payment_count"
        )
    )


    vendor_stats = pd.concat(
        [
            vendor_project_count,
            vendor_total_expenditure,
            vendor_payment_count
        ],
        axis=1
    ).reset_index()


    # --------------------------------------------------------
    # Project → Vendor mapping
    # --------------------------------------------------------

    project_vendor = (
        vendor_data[
            [
                "WORK_RECOMMENDATION_DTL_ID",
                "VENDOR_NAME"
            ]
        ]
        .drop_duplicates(
            "WORK_RECOMMENDATION_DTL_ID"
        )
    )


    projects = projects.merge(
        project_vendor,
        on="WORK_RECOMMENDATION_DTL_ID",
        how="left"
    )


    # --------------------------------------------------------
    # Add vendor statistics
    # --------------------------------------------------------

    projects = projects.merge(
        vendor_stats,
        on="VENDOR_NAME",
        how="left"
    )


    # --------------------------------------------------------
    # Vendor expenditure share
    # --------------------------------------------------------

    total_vendor_expenditure = (
        vendor_stats[
            "vendor_total_expenditure"
        ].sum()
    )


    if total_vendor_expenditure > 0:

        projects[
            "vendor_expenditure_share_pct"
        ] = (

            projects[
                "vendor_total_expenditure"
            ]

            /

            total_vendor_expenditure

        ) * 100

    else:

        projects[
            "vendor_expenditure_share_pct"
        ] = np.nan


else:

    projects["VENDOR_NAME"] = np.nan

    projects["vendor_project_count"] = np.nan

    projects["vendor_total_expenditure"] = np.nan

    projects["vendor_payment_count"] = np.nan

    projects["vendor_expenditure_share_pct"] = np.nan


vendor_columns = [
    "WORK_RECOMMENDATION_DTL_ID",
    "VENDOR_NAME",
    "vendor_project_count",
    "vendor_total_expenditure",
    "vendor_payment_count",
    "vendor_expenditure_share_pct"
]


print(
    projects[
        vendor_columns
    ]
    .dropna(
        subset=["VENDOR_NAME"]
    )
    .to_string(index=False)
)


# ============================================================
# 11. POTENTIAL DUPLICATE / SIMILAR PROJECT DETECTION
# ============================================================

print("\n==========================================")
print("SIMILAR PROJECT DETECTION")
print("==========================================")


projects["project_text"] = (

    projects["ACTIVITY_TYPE"]
    .fillna("")
    .astype(str)

    + " "

    + projects["WORK_DESCRIPTION"]
    .fillna("")
    .astype(str)
)


projects["project_text"] = (

    projects["project_text"]
    .str.lower()

    .str.replace(
        r"[^a-z0-9\s]",
        " ",
        regex=True
    )

    .str.replace(
        r"\s+",
        " ",
        regex=True
    )

    .str.strip()
)


similarity_threshold = 0.90


max_similarity = []

similar_project_id = []


project_ids = (
    projects[
        "WORK_RECOMMENDATION_DTL_ID"
    ]
    .tolist()
)


texts = (
    projects["project_text"]
    .tolist()
)


for i in range(len(projects)):

    best_similarity = 0

    best_project = np.nan


    for j in range(len(projects)):

        if i == j:

            continue


        text_a = texts[i]

        text_b = texts[j]


        if (
            not text_a
            or not text_b
        ):

            continue


        similarity = SequenceMatcher(
            None,
            text_a,
            text_b
        ).ratio()


        if similarity > best_similarity:

            best_similarity = similarity

            best_project = project_ids[j]


    max_similarity.append(
        best_similarity
    )

    similar_project_id.append(
        best_project
    )


projects[
    "max_project_similarity_pct"
] = (

    np.array(max_similarity)

    * 100
)


projects[
    "similar_project_id"
] = (
    similar_project_id
)


projects[
    "potential_duplicate"
] = (

    projects[
        "max_project_similarity_pct"
    ]

    >= similarity_threshold * 100
)


print(
    projects[
        [
            "WORK_RECOMMENDATION_DTL_ID",
            "max_project_similarity_pct",
            "similar_project_id",
            "potential_duplicate"
        ]
    ]
    .sort_values(
        "max_project_similarity_pct",
        ascending=False
    )
    .head(10)
    .to_string(index=False)
)


# ============================================================
# 12. EXPLAINABLE RISK ENGINE
# ============================================================

print("\n==========================================")
print("EXPLAINABLE RISK ENGINE")
print("==========================================")


projects["rule_risk_score"] = 0

projects["risk_reasons"] = ""


# ============================================================
# RULE 1: EXPENDITURE > SANCTION
# ============================================================

condition = (

    projects["total_expenditure"].notna()

    & projects["SANCTION_AMOUNT"].notna()

    & (

        projects["total_expenditure"]

        >

        projects["SANCTION_AMOUNT"]

    )
)


projects.loc[
    condition,
    "rule_risk_score"
] += 15


for idx in projects.index[condition]:

    expenditure_amount = (
        projects.loc[
            idx,
            "total_expenditure"
        ]
    )


    sanction_amount = (
        projects.loc[
            idx,
            "SANCTION_AMOUNT"
        ]
    )


    difference = (
        expenditure_amount
        - sanction_amount
    )


    percentage = (
        difference
        / sanction_amount
    ) * 100


    projects.loc[
        idx,
        "risk_reasons"
    ] += (

        f"Expenditure ₹{expenditure_amount:,.0f} "
        f"exceeds sanction ₹{sanction_amount:,.0f} "
        f"by ₹{difference:,.0f} "
        f"(+{percentage:.1f}%); "

    )


# ============================================================
# RULE 2: ACTUAL COST > SANCTION
# ============================================================

condition = (

    projects["ACTUAL_AMOUNT"].notna()

    & projects["SANCTION_AMOUNT"].notna()

    & (

        projects["ACTUAL_AMOUNT"]

        >

        projects["SANCTION_AMOUNT"]

    )
)


projects.loc[
    condition,
    "rule_risk_score"
] += 15


for idx in projects.index[condition]:

    actual_amount = (
        projects.loc[
            idx,
            "ACTUAL_AMOUNT"
        ]
    )


    sanction_amount = (
        projects.loc[
            idx,
            "SANCTION_AMOUNT"
        ]
    )


    difference = (
        actual_amount
        - sanction_amount
    )


    percentage = (
        difference
        / sanction_amount
    ) * 100


    projects.loc[
        idx,
        "risk_reasons"
    ] += (

        f"Actual cost ₹{actual_amount:,.0f} "
        f"exceeds sanction ₹{sanction_amount:,.0f} "
        f"by ₹{difference:,.0f} "
        f"(+{percentage:.1f}%); "

    )


# ============================================================
# RULE 3: PAYMENT BEFORE SANCTION
# ============================================================

condition = (

    projects["first_payment_date"].notna()

    & projects["SANCTION_DATE"].notna()

    & (

        projects["first_payment_date"]

        <

        projects["SANCTION_DATE"]

    )
)


projects.loc[
    condition,
    "rule_risk_score"
] += 10


for idx in projects.index[condition]:

    payment_date = (
        projects.loc[
            idx,
            "first_payment_date"
        ]
    )


    sanction_date = (
        projects.loc[
            idx,
            "SANCTION_DATE"
        ]
    )


    days = (
        sanction_date
        - payment_date
    ).days


    projects.loc[
        idx,
        "risk_reasons"
    ] += (

        f"Payment occurred {days} days "
        f"before sanction; "

    )


# ============================================================
# RULE 4: LONG PAYMENT DURATION
# ============================================================

condition = (

    projects["payment_duration_days"].notna()

    & (

        projects["payment_duration_days"]

        >

        180

    )
)


projects.loc[
    condition,
    "rule_risk_score"
] += 5


for idx in projects.index[condition]:

    days = (
        projects.loc[
            idx,
            "payment_duration_days"
        ]
    )


    projects.loc[
        idx,
        "risk_reasons"
    ] += (

        f"Payments span {days:.0f} days; "

    )


# ============================================================
# RULE 5: LONG COMPLETION
# ============================================================

condition = (

    projects["sanction_to_completion_days"].notna()

    & (

        projects[
            "sanction_to_completion_days"
        ]

        >

        365

    )
)


projects.loc[
    condition,
    "rule_risk_score"
] += 5


for idx in projects.index[condition]:

    days = (
        projects.loc[
            idx,
            "sanction_to_completion_days"
        ]
    )


    projects.loc[
        idx,
        "risk_reasons"
    ] += (

        f"Completion took {days:.0f} days "
        f"after sanction; "

    )


# ============================================================
# RULE 6: POTENTIAL DUPLICATE
# ============================================================

condition = (
    projects["potential_duplicate"]
    == True
)


projects.loc[
    condition,
    "rule_risk_score"
] += 10


for idx in projects.index[condition]:

    similarity = (
        projects.loc[
            idx,
            "max_project_similarity_pct"
        ]
    )


    similar_id = (
        projects.loc[
            idx,
            "similar_project_id"
        ]
    )


    if pd.notna(similar_id):

        projects.loc[
            idx,
            "risk_reasons"
        ] += (

            f"Potentially similar to project "
            f"{similar_id:.0f} "
            f"with {similarity:.1f}% "
            f"text similarity; "

        )


# ============================================================
# RULE 7: VENDOR PATTERN
# ============================================================

if "vendor_project_count" in projects.columns:

    condition = (

        projects[
            "vendor_project_count"
        ].notna()

        & (

            projects[
                "vendor_project_count"
            ]

            >=

            2

        )
    )


    projects.loc[
        condition,
        "rule_risk_score"
    ] += 5


    for idx in projects.index[condition]:

        vendor = projects.loc[
            idx,
            "VENDOR_NAME"
        ]


        vendor_projects = projects.loc[
            idx,
            "vendor_project_count"
        ]


        vendor_amount = projects.loc[
            idx,
            "vendor_total_expenditure"
        ]


        projects.loc[
            idx,
            "risk_reasons"
        ] += (

            f"Vendor {vendor} is associated "
            f"with {vendor_projects:.0f} projects "
            f"and ₹{vendor_amount:,.0f} "
            f"total expenditure; "

        )


# ============================================================
# 13. NORMALIZED ML RISK COMPONENT
# ============================================================

anomaly_min = (
    projects["anomaly_score"].min()
)


anomaly_max = (
    projects["anomaly_score"].max()
)


if anomaly_max > anomaly_min:

    projects["ml_risk_component"] = (

        (

            projects["anomaly_score"]

            -

            anomaly_min

        )

        /

        (

            anomaly_max

            -

            anomaly_min

        )

    ) * 40

else:

    projects["ml_risk_component"] = 0


# ============================================================
# 14. PEER RISK COMPONENT
# ============================================================

projects["peer_risk_component"] = 0


positive_peer = (

    projects[
        "peer_amount_deviation_pct"
    ]

    .clip(
        lower=0,
        upper=100
    )
)


projects["peer_risk_component"] = (

    positive_peer

    / 100

) * 20


projects.loc[
    projects["peer_count"] < 2,
    "peer_risk_component"
] = 0


# ============================================================
# 15. IMPORTANT:
# PEER DEVIATION IS NOT ADDED TO RULE_RISK_SCORE
#
# This avoids double-counting the same peer signal.
# ============================================================


projects["rule_risk_component"] = (

    projects["rule_risk_score"]

    .clip(
        upper=40
    )
)


# ============================================================
# 16. FINAL INVESTIGATION RISK SCORE
# ============================================================

projects["final_risk_score"] = (

    projects["ml_risk_component"]

    +

    projects["peer_risk_component"]

    +

    projects["rule_risk_component"]

)


projects["final_risk_score"] = (

    projects["final_risk_score"]

    .clip(
        lower=0,
        upper=100
    )
)


# ============================================================
# 17. RISK LEVEL
# ============================================================

projects["risk_level"] = np.select(

    [

        projects["final_risk_score"]
        >= 80,

        projects["final_risk_score"]
        >= 60,

        projects["final_risk_score"]
        >= 35

    ],

    [

        "Critical Review",

        "High",

        "Medium"

    ],

    default="Low"
)


# ============================================================
# 18. ADD ML EXPLANATION
# ============================================================

for idx in projects.index:

    anomaly_score = (
        projects.loc[
            idx,
            "anomaly_score_100"
        ]
    )


    projects.loc[
        idx,
        "risk_reasons"
    ] = (

        f"Anomaly Score: "
        f"{anomaly_score:.1f}/100; "

        +

        projects.loc[
            idx,
            "risk_reasons"
        ]

    )


# ============================================================
# 19. DATA CONFIDENCE WARNING
# ============================================================

for idx in projects.index:

    confidence = (
        projects.loc[
            idx,
            "data_confidence_pct"
        ]
    )


    if confidence < 50:

        projects.loc[
            idx,
            "risk_reasons"
        ] += (

            f"Low data confidence "
            f"({confidence:.1f}%); "

        )

    elif confidence < 75:

        projects.loc[
            idx,
            "risk_reasons"
        ] += (

            f"Moderate data confidence "
            f"({confidence:.1f}%); "

        )


# ============================================================
# 20. FINAL RESULTS
# ============================================================

print("\n==========================================")
print("FINAL INVESTIGATION RISK RESULTS")
print("==========================================")


final_columns = [

    "WORK_RECOMMENDATION_DTL_ID",

    "ACTIVITY_TYPE",

    "SANCTION_AMOUNT",

    "total_expenditure",

    "anomaly_score_100",

    "peer_average_amount",

    "peer_amount_deviation_pct",

    "vendor_project_count",

    "vendor_total_expenditure",

    "max_project_similarity_pct",

    "potential_duplicate",

    "rule_risk_score",

    "ml_risk_component",

    "peer_risk_component",

    "final_risk_score",

    "risk_level",

    "data_confidence_pct",

    "risk_reasons"

]


final_columns = [

    col

    for col in final_columns

    if col in projects.columns

]


final_results = (

    projects[
        final_columns
    ]

    .sort_values(
        "final_risk_score",
        ascending=False
    )
)


print(

    final_results
    .head(15)
    .to_string(index=False)

)


# ============================================================
# 21. RISK SUMMARY
# ============================================================

print("\n==========================================")
print("RISK SUMMARY")
print("==========================================")


print(

    projects[
        "risk_level"
    ]
    .value_counts()

)


# ============================================================
# 22. SCORE SUMMARY
# ============================================================

print("\n==========================================")
print("SCORE SUMMARY")
print("==========================================")


print(
    projects[
        [
            "WORK_RECOMMENDATION_DTL_ID",
            "final_risk_score",
            "risk_level",
            "data_confidence_pct"
        ]
    ]
    .sort_values(
        "final_risk_score",
        ascending=False
    )
    .head(15)
    .to_string(index=False)
)


# ============================================================
# 23. SAVE FINAL DATASET
# ============================================================

output_file = (
    "final_mplads_risk_dataset.csv"
)


projects.to_csv(
    output_file,
    index=False,
    encoding="utf-8-sig"
)


print("\n==========================================")
print("DATASET SAVED")
print("==========================================")


print(
    "Saved:",
    output_file
)


print(
    "Total projects:",
    len(projects)
)


print(
    "Total columns:",
    len(projects.columns)
)


# ============================================================
# 24. SAVE HIGH-RISK PROJECTS
# ============================================================

high_risk_file = (
    "high_risk_mplads_projects.csv"
)


high_risk_projects = projects[
    projects["risk_level"].isin(
        [
            "High",
            "Critical Review"
        ]
    )
].copy()


high_risk_projects.to_csv(
    high_risk_file,
    index=False,
    encoding="utf-8-sig"
)


print(
    "Saved high-risk projects:",
    high_risk_file
)


# ============================================================
# 25. COMPLETE
# ============================================================

print("\n==========================================")
print("PIPELINE COMPLETED SUCCESSFULLY")
print("==========================================")


print(
    "Data → Features → Anomaly Detection "
    "→ Peer Analysis → Vendor Analysis "
    "→ Similarity Detection → Risk Engine "
    "→ Final Dataset"
)