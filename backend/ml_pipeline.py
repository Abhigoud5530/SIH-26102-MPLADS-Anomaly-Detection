import pandas as pd
import numpy as np

from difflib import SequenceMatcher
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# CUSTOM ISOLATION TREE
# ============================================================

class IsolationTree:

    def __init__(self, max_depth=8, random_state=42):
        self.max_depth = max_depth
        self.random_state = random_state
        self.tree = None
        self.rng = np.random.default_rng(random_state)

    def build_tree(self, X, depth=0):

        n_samples, n_features = X.shape

        # Stop condition
        if depth >= self.max_depth or n_samples <= 1:

            return {
                "leaf": True,
                "size": n_samples
            }

        # Random feature
        feature = self.rng.integers(
            0,
            n_features
        )

        values = X[:, feature]

        min_value = values.min()
        max_value = values.max()

        # If all values are identical
        if min_value == max_value:

            return {
                "leaf": True,
                "size": n_samples
            }

        # Random split
        split = self.rng.uniform(
            min_value,
            max_value
        )

        left_mask = values < split
        right_mask = ~left_mask

        # Invalid split
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

        if sample[node["feature"]] < node["split"]:

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
# MAIN PIPELINE
# ============================================================

def run_pipeline():

    # ========================================================
    # 1. LOAD DATA
    # ========================================================

    recommended = pd.read_csv(
        BASE_DIR / "recommended.csv"
    )

    sanctioned = pd.read_csv(
        BASE_DIR / "sanctioned.csv"
    )

    completed = pd.read_csv(
        BASE_DIR / "completed.csv"
    )

    expenditure = pd.read_csv(
        BASE_DIR / "expenditure.csv"
    )


    # ========================================================
    # 2. REMOVE INVALID PROJECTS
    # ========================================================

    projects = recommended.copy()

    projects = projects[
        projects[
            "WORK_RECOMMENDATION_DTL_ID"
        ].notna()
    ].copy()


    # ========================================================
    # 3. PREPARE EXPENDITURE DATA
    # ========================================================

    expenditure[
        "EXPENDITURE_DATE"
    ] = pd.to_datetime(
        expenditure[
            "EXPENDITURE_DATE"
        ],
        errors="coerce"
    )

    expenditure[
        "FUND_DISBURSED_AMT"
    ] = pd.to_numeric(
        expenditure[
            "FUND_DISBURSED_AMT"
        ],
        errors="coerce"
    )


    expenditure_summary = (

        expenditure

        .groupby(
            "WORK_RECOMMENDATION_DTL_ID"
        )

        .agg(

            total_expenditure=(
                "FUND_DISBURSED_AMT",
                "sum"
            ),

            payment_count=(
                "FUND_DISBURSED_AMT",
                "count"
            ),

            first_payment_date=(
                "EXPENDITURE_DATE",
                "min"
            ),

            last_payment_date=(
                "EXPENDITURE_DATE",
                "max"
            )

        )

        .reset_index()
    )


    # ========================================================
    # 4. PREPARE SANCTION DATA
    # ========================================================
    #
    # recommended.csv already contains SANCTION_AMOUNT
    # and SANCTION_DATE.
    #
    # Therefore we DO NOT directly merge another column
    # with the same name.
    #
    # sanctioned.csv is only used to fill missing values.
    # ========================================================

    sanction_lookup = (

        sanctioned[
            [
                "WORK_RECOMMENDATION_DTL_ID",
                "SANCTION_AMOUNT",
                "SANCTION_DATE"
            ]
        ]

        .drop_duplicates(
            "WORK_RECOMMENDATION_DTL_ID"
        )

        .copy()
    )


    sanction_lookup = sanction_lookup.rename(

        columns={

            "SANCTION_AMOUNT":
                "SANCTION_AMOUNT_FROM_SANCTIONED",

            "SANCTION_DATE":
                "SANCTION_DATE_FROM_SANCTIONED"

        }
    )


    projects = projects.merge(

        sanction_lookup,

        on="WORK_RECOMMENDATION_DTL_ID",

        how="left"
    )


    # Convert existing values

    projects[
        "SANCTION_AMOUNT"
    ] = pd.to_numeric(

        projects[
            "SANCTION_AMOUNT"
        ],

        errors="coerce"

    )


    projects[
        "SANCTION_DATE"
    ] = pd.to_datetime(

        projects[
            "SANCTION_DATE"
        ],

        errors="coerce"

    )


    # Fill missing values from sanctioned.csv

    projects[
        "SANCTION_AMOUNT"
    ] = (

        projects[
            "SANCTION_AMOUNT"
        ]

        .fillna(

            pd.to_numeric(

                projects[
                    "SANCTION_AMOUNT_FROM_SANCTIONED"
                ],

                errors="coerce"

            )

        )

    )


    projects[
        "SANCTION_DATE"
    ] = (

        projects[
            "SANCTION_DATE"
        ]

        .fillna(

            pd.to_datetime(

                projects[
                    "SANCTION_DATE_FROM_SANCTIONED"
                ],

                errors="coerce"

            )

        )

    )


    # Remove temporary columns

    projects = projects.drop(

        columns=[

            "SANCTION_AMOUNT_FROM_SANCTIONED",

            "SANCTION_DATE_FROM_SANCTIONED"

        ],

        errors="ignore"

    )


    # ========================================================
    # 5. MERGE COMPLETION DATA
    # ========================================================

    completed_lookup = (

        completed[

            [
                "WORK_RECOMMENDATION_DTL_ID",
                "ACTUAL_AMOUNT",
                "ACTUAL_END_DATE",
                "AVERAGE_RATING"
            ]

        ]

        .drop_duplicates(
            "WORK_RECOMMENDATION_DTL_ID"
        )

        .copy()

    )


    projects = projects.merge(

        completed_lookup,

        on="WORK_RECOMMENDATION_DTL_ID",

        how="left"

    )


    # ========================================================
    # 6. MERGE EXPENDITURE SUMMARY
    # ========================================================

    projects = projects.merge(

        expenditure_summary,

        on="WORK_RECOMMENDATION_DTL_ID",

        how="left"

    )


    # ========================================================
    # 7. BASIC DATA CLEANING
    # ========================================================

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


    # ========================================================
    # 8. FEATURE ENGINEERING
    # ========================================================

    # Expenditure / sanction ratio

    projects[
        "expenditure_ratio"
    ] = (

        projects[
            "total_expenditure"
        ]

        /

        projects[
            "SANCTION_AMOUNT"
        ]

    )


    # Difference between sanction and expenditure

    projects[
        "amount_difference"
    ] = (

        projects[
            "SANCTION_AMOUNT"
        ]

        -

        projects[
            "total_expenditure"
        ]

    )


    # Recommendation → sanction

    projects[
        "recommendation_to_sanction_days"
    ] = (

        projects[
            "SANCTION_DATE"
        ]

        -

        projects[
            "RECOMMENDATION_DATE"
        ]

    ).dt.days


    # Sanction → payment

    projects[
        "sanction_to_payment_days"
    ] = (

        projects[
            "first_payment_date"
        ]

        -

        projects[
            "SANCTION_DATE"
        ]

    ).dt.days


    # Sanction → completion

    projects[
        "sanction_to_completion_days"
    ] = (

        projects[
            "ACTUAL_END_DATE"
        ]

        -

        projects[
            "SANCTION_DATE"
        ]

    ).dt.days


    # Payment duration

    projects[
        "payment_duration_days"
    ] = (

        projects[
            "last_payment_date"
        ]

        -

        projects[
            "first_payment_date"
        ]

    ).dt.days


    # Actual cost difference

    projects[
        "actual_amount_difference"
    ] = (

        projects[
            "SANCTION_AMOUNT"
        ]

        -

        projects[
            "ACTUAL_AMOUNT"
        ]

    )


    # ========================================================
    # 9. DATA CONFIDENCE
    # ========================================================

    important_fields = [

        "SANCTION_AMOUNT",
        "SANCTION_DATE",
        "ACTUAL_AMOUNT",
        "ACTUAL_END_DATE",
        "total_expenditure",
        "first_payment_date",
        "last_payment_date"

    ]


    projects[
        "data_completeness"
    ] = (

        projects[
            important_fields
        ]

        .notna()

        .mean(axis=1)

    )


    projects[
        "data_confidence_pct"
    ] = (

        projects[
            "data_completeness"
        ]

        * 100

    )


    # ========================================================
    # 10. CUSTOM ISOLATION FOREST
    # ========================================================

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


    X = projects[
        ml_features
    ].copy()


    # Remove infinite values

    X = X.replace(

        [
            np.inf,
            -np.inf
        ],

        np.nan

    )


    # Fill missing values using medians

    X = X.fillna(

        X.median(
            numeric_only=True
        )

    )


    # Any remaining missing values → 0

    X = X.fillna(0)


    X = X.to_numpy(
        dtype=float
    )


    # --------------------------------------------------------
    # Build trees
    # --------------------------------------------------------

    n_trees = 100

    trees = []


    for i in range(n_trees):

        tree = IsolationTree(

            max_depth=8,

            random_state=42 + i

        )

        tree.fit(X)

        trees.append(tree)


    # --------------------------------------------------------
    # Calculate path lengths
    # --------------------------------------------------------

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


    # --------------------------------------------------------
    # Isolation Forest normalization
    # --------------------------------------------------------

    n = len(X)


    if n > 2:

        c_n = (

            2

            *

            (

                np.log(n - 1)

                +

                0.5772156649

            )

            -

            (

                2 * (n - 1) / n

            )

        )

    else:

        c_n = 1


    anomaly_scores = (

        2

        **

        (

            -path_lengths / c_n

        )

    )


    projects[
        "anomaly_score"
    ] = anomaly_scores


    projects[
        "anomaly_score_100"
    ] = (

        projects[
            "anomaly_score"
        ]

        * 100

    )


    # Top 10% anomaly flag

    threshold = np.percentile(

        anomaly_scores,

        90

    )


    projects[
        "anomaly_prediction"
    ] = np.where(

        projects[
            "anomaly_score"
        ]

        >= threshold,

        -1,

        1

    )


    # ========================================================
    # 11. PEER COMPARISON
    # ========================================================

    projects[
        "ACTIVITY_TYPE"
    ] = (

        projects[
            "ACTIVITY_NAME"
        ]

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

        .groupby(
            peer_columns
        )[

            "SANCTION_AMOUNT"

        ]

        .transform("sum")

    )


    group_count = (

        projects

        .groupby(
            peer_columns
        )[

            "SANCTION_AMOUNT"

        ]

        .transform("count")

    )


    projects[
        "peer_count"
    ] = (

        group_count - 1

    )


    # Avoid division by zero

    projects[
        "peer_average_amount"
    ] = np.where(

        projects[
            "peer_count"
        ] > 0,

        (

            group_total

            -

            projects[
                "SANCTION_AMOUNT"
            ]

        )

        /

        projects[
            "peer_count"
        ],

        np.nan

    )


    projects[
        "peer_amount_difference"
    ] = (

        projects[
            "SANCTION_AMOUNT"
        ]

        -

        projects[
            "peer_average_amount"
        ]

    )


    projects[
        "peer_amount_deviation_pct"
    ] = np.where(

        (

            projects[
                "peer_average_amount"
            ]

            > 0

        ),

        (

            projects[
                "peer_amount_difference"
            ]

            /

            projects[
                "peer_average_amount"
            ]

        )

        * 100,

        np.nan

    )


    # ========================================================
    # 12. VENDOR / PAYMENT ANALYSIS
    # ========================================================

    vendor_data = expenditure[

        expenditure[
            "VENDOR_NAME"
        ].notna()

    ].copy()


    if len(vendor_data) > 0:

        # ----------------------------------------------------
        # Vendor statistics
        # ----------------------------------------------------

        vendor_project_count = (

            vendor_data

            .groupby(
                "VENDOR_NAME"
            )[

                "WORK_RECOMMENDATION_DTL_ID"

            ]

            .nunique()

            .rename(
                "vendor_project_count"
            )

        )


        vendor_total_expenditure = (

            vendor_data

            .groupby(
                "VENDOR_NAME"
            )[

                "FUND_DISBURSED_AMT"

            ]

            .sum()

            .rename(
                "vendor_total_expenditure"
            )

        )


        vendor_payment_count = (

            vendor_data

            .groupby(
                "VENDOR_NAME"
            )[

                "FUND_DISBURSED_AMT"

            ]

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


        # ----------------------------------------------------
        # Find primary vendor for each project
        #
        # If multiple vendors exist for one project,
        # choose the vendor receiving the highest expenditure.
        # ----------------------------------------------------

        project_vendor = (

            vendor_data

            .groupby(

                [

                    "WORK_RECOMMENDATION_DTL_ID",
                    "VENDOR_NAME"

                ]

            )[

                "FUND_DISBURSED_AMT"

            ]

            .sum()

            .reset_index()

        )


        project_vendor = (

            project_vendor

            .sort_values(

                "FUND_DISBURSED_AMT",

                ascending=False

            )

            .drop_duplicates(

                "WORK_RECOMMENDATION_DTL_ID"

            )

            .drop(

                columns=[
                    "FUND_DISBURSED_AMT"
                ]

            )

        )


        # ----------------------------------------------------
        # Merge primary vendor
        # ----------------------------------------------------

        projects = projects.merge(

            project_vendor,

            on="WORK_RECOMMENDATION_DTL_ID",

            how="left"

        )


        # ----------------------------------------------------
        # Merge vendor statistics
        # ----------------------------------------------------

        projects = projects.merge(

            vendor_stats,

            on="VENDOR_NAME",

            how="left"

        )


        # ----------------------------------------------------
        # Vendor expenditure share
        # ----------------------------------------------------

        total_vendor_expenditure = (

            vendor_stats[
                "vendor_total_expenditure"
            ]

            .sum()

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

        projects[
            "VENDOR_NAME"
        ] = np.nan


        projects[
            "vendor_project_count"
        ] = np.nan


        projects[
            "vendor_total_expenditure"
        ] = np.nan


        projects[
            "vendor_payment_count"
        ] = np.nan


        projects[
            "vendor_expenditure_share_pct"
        ] = np.nan


    # ========================================================
    # 13. SIMILAR PROJECT DETECTION
    # ========================================================

    projects[
        "project_text"
    ] = (

        projects[
            "ACTIVITY_TYPE"
        ]

        .fillna("")

        .astype(str)

        +

        " "

        +

        projects[
            "WORK_DESCRIPTION"
        ]

        .fillna("")

        .astype(str)

    )


    # Normalize text

    projects[
        "project_text"
    ] = (

        projects[
            "project_text"
        ]

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


    project_ids = (

        projects[
            "WORK_RECOMMENDATION_DTL_ID"
        ]

        .tolist()

    )


    texts = (

        projects[
            "project_text"
        ]

        .tolist()

    )


    max_similarity = []

    similar_project_id = []


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

                or

                not text_b

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

        np.array(
            max_similarity
        )

        * 100

    )


    projects[
        "similar_project_id"
    ] = similar_project_id


    projects[
        "potential_duplicate"
    ] = (

        projects[
            "max_project_similarity_pct"
        ]

        >= 90

    )


    # ========================================================
    # 14. EXPLAINABLE RISK ENGINE
    # ========================================================

    projects[
        "rule_risk_score"
    ] = 0


    projects[
        "risk_reasons"
    ] = ""


    # --------------------------------------------------------
    # RULE 1: EXPENDITURE > SANCTION
    # --------------------------------------------------------

    condition = (

        projects[
            "total_expenditure"
        ].notna()

        &

        projects[
            "SANCTION_AMOUNT"
        ].notna()

        &

        (

            projects[
                "total_expenditure"
            ]

            >

            projects[
                "SANCTION_AMOUNT"
            ]

        )

    )


    projects.loc[
        condition,
        "rule_risk_score"
    ] += 15


    for idx in projects.index[condition]:

        expenditure_amount = projects.loc[

            idx,

            "total_expenditure"

        ]


        sanction_amount = projects.loc[

            idx,

            "SANCTION_AMOUNT"

        ]


        difference = (

            expenditure_amount

            -

            sanction_amount

        )


        percentage = (

            difference

            /

            sanction_amount

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


    # --------------------------------------------------------
    # RULE 2: ACTUAL COST > SANCTION
    # --------------------------------------------------------

    condition = (

        projects[
            "ACTUAL_AMOUNT"
        ].notna()

        &

        projects[
            "SANCTION_AMOUNT"
        ].notna()

        &

        (

            projects[
                "ACTUAL_AMOUNT"
            ]

            >

            projects[
                "SANCTION_AMOUNT"
            ]

        )

    )


    projects.loc[

        condition,

        "rule_risk_score"

    ] += 15


    for idx in projects.index[condition]:

        actual_amount = projects.loc[

            idx,

            "ACTUAL_AMOUNT"

        ]


        sanction_amount = projects.loc[

            idx,

            "SANCTION_AMOUNT"

        ]


        difference = (

            actual_amount

            -

            sanction_amount

        )


        percentage = (

            difference

            /

            sanction_amount

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


    # --------------------------------------------------------
    # RULE 3: PAYMENT BEFORE SANCTION
    # --------------------------------------------------------

    condition = (

        projects[
            "first_payment_date"
        ].notna()

        &

        projects[
            "SANCTION_DATE"
        ].notna()

        &

        (

            projects[
                "first_payment_date"
            ]

            <

            projects[
                "SANCTION_DATE"
            ]

        )

    )


    projects.loc[

        condition,

        "rule_risk_score"

    ] += 10


    for idx in projects.index[condition]:

        payment_date = projects.loc[

            idx,

            "first_payment_date"

        ]


        sanction_date = projects.loc[

            idx,

            "SANCTION_DATE"

        ]


        days = (

            sanction_date

            -

            payment_date

        ).days


        projects.loc[

            idx,

            "risk_reasons"

        ] += (

            f"Payment occurred {days} days "

            f"before sanction; "

        )


    # --------------------------------------------------------
    # RULE 4: LONG PAYMENT DURATION
    # --------------------------------------------------------

    condition = (

        projects[
            "payment_duration_days"
        ].notna()

        &

        (

            projects[
                "payment_duration_days"
            ]

            >

            180

        )

    )


    projects.loc[

        condition,

        "rule_risk_score"

    ] += 5


    for idx in projects.index[condition]:

        days = projects.loc[

            idx,

            "payment_duration_days"

        ]


        projects.loc[

            idx,

            "risk_reasons"

        ] += (

            f"Payments span {days:.0f} days; "

        )


    # --------------------------------------------------------
    # RULE 5: LONG COMPLETION
    # --------------------------------------------------------

    condition = (

        projects[
            "sanction_to_completion_days"
        ].notna()

        &

        (

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

        days = projects.loc[

            idx,

            "sanction_to_completion_days"

        ]


        projects.loc[

            idx,

            "risk_reasons"

        ] += (

            f"Completion took {days:.0f} days "

            f"after sanction; "

        )


    # --------------------------------------------------------
    # RULE 6: POTENTIAL DUPLICATE
    # --------------------------------------------------------

    condition = (

        projects[
            "potential_duplicate"
        ]

        == True

    )


    projects.loc[

        condition,

        "rule_risk_score"

    ] += 10


    for idx in projects.index[condition]:

        similarity = projects.loc[

            idx,

            "max_project_similarity_pct"

        ]


        similar_id = projects.loc[

            idx,

            "similar_project_id"

        ]


        if pd.notna(similar_id):

            projects.loc[

                idx,

                "risk_reasons"

            ] += (

                f"Potentially similar to "

                f"project {similar_id:.0f} "

                f"with {similarity:.1f}% "

                f"text similarity; "

            )


    # --------------------------------------------------------
    # RULE 7: VENDOR PATTERN
    # --------------------------------------------------------

    condition = (

        projects[
            "vendor_project_count"
        ].notna()

        &

        (

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


    # ========================================================
    # 15. ML RISK COMPONENT
    # ========================================================

    anomaly_min = projects[
        "anomaly_score"
    ].min()


    anomaly_max = projects[
        "anomaly_score"
    ].max()


    if anomaly_max > anomaly_min:

        projects[
            "ml_risk_component"
        ] = (

            (

                projects[
                    "anomaly_score"
                ]

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

        projects[
            "ml_risk_component"
        ] = 0


    # Ensure no NaN

    projects[
        "ml_risk_component"
    ] = (

        projects[
            "ml_risk_component"
        ]

        .fillna(0)

    )


    # ========================================================
    # 16. PEER RISK COMPONENT
    # ========================================================

    positive_peer = (

        projects[
            "peer_amount_deviation_pct"
        ]

        .clip(

            lower=0,

            upper=100

        )

        .fillna(0)

    )


    projects[
        "peer_risk_component"
    ] = (

        positive_peer

        / 100

    ) * 20


    # Projects with fewer than 2 peers
    # do not receive peer risk.

    projects.loc[

        projects[
            "peer_count"
        ].fillna(0) < 2,

        "peer_risk_component"

    ] = 0


    # ========================================================
    # 17. RULE RISK COMPONENT
    # ========================================================

    projects[
        "rule_risk_component"
    ] = (

        projects[
            "rule_risk_score"
        ]

        .clip(

            lower=0,

            upper=40

        )

        .fillna(0)

    )


    # ========================================================
    # 18. FINAL INVESTIGATION RISK SCORE
    # ========================================================

    projects[
        "final_risk_score"
    ] = (

        projects[
            "ml_risk_component"
        ]

        +

        projects[
            "peer_risk_component"
        ]

        +

        projects[
            "rule_risk_component"
        ]

    )


    # Remove any accidental NaN

    projects[
        "final_risk_score"
    ] = (

        projects[
            "final_risk_score"
        ]

        .replace(

            [
                np.inf,
                -np.inf
            ],

            np.nan

        )

        .fillna(0)

        .clip(

            lower=0,

            upper=100

        )

    )


    # ========================================================
    # 19. RISK LEVEL
    # ========================================================

    projects[
        "risk_level"
    ] = np.select(

        [

            projects[
                "final_risk_score"
            ] >= 80,

            projects[
                "final_risk_score"
            ] >= 60,

            projects[
                "final_risk_score"
            ] >= 35

        ],

        [

            "Critical Review",

            "High",

            "Medium"

        ],

        default="Low"

    )


    # ========================================================
    # 20. EXPLAINABLE RISK REASONS
    # ========================================================

    for idx in projects.index:

        anomaly_score = projects.loc[

            idx,

            "anomaly_score_100"

        ]


        if pd.isna(anomaly_score):

            anomaly_score = 0


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


        confidence = projects.loc[

            idx,

            "data_confidence_pct"

        ]


        if pd.isna(confidence):

            confidence = 0


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


    # ========================================================
    # 21. CLEAN NUMERIC VALUES
    # ========================================================

    numeric_columns = [

        "anomaly_score",
        "anomaly_score_100",
        "data_completeness",
        "data_confidence_pct",
        "peer_count",
        "peer_average_amount",
        "peer_amount_difference",
        "peer_amount_deviation_pct",
        "vendor_project_count",
        "vendor_total_expenditure",
        "vendor_payment_count",
        "vendor_expenditure_share_pct",
        "max_project_similarity_pct",
        "rule_risk_score",
        "ml_risk_component",
        "peer_risk_component",
        "rule_risk_component",
        "final_risk_score"

    ]


    for col in numeric_columns:

        if col in projects.columns:

            projects[col] = (

                pd.to_numeric(

                    projects[col],

                    errors="coerce"

                )

            )


    # ========================================================
    # 22. RETURN RESULTS
    # ========================================================

    return projects