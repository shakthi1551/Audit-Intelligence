import os
from urllib.parse import urlsplit

import requests
import streamlit as st


SESSION_KEY = "fraud_evaluation_session"


def api_base_url() -> str:
    configured = os.environ.get("AUDITIQ_API_BASE_URL")
    if configured:
        return configured.rstrip("/")

    development_domain = os.environ.get("REPLIT_DEV_DOMAIN")
    if development_domain:
        return "http://localhost:80/api"

    domain = os.environ.get("REPLIT_DOMAINS", "").split(",")[0].strip()
    if domain:
        if "://" not in domain:
            domain = f"https://{domain}"
        parsed = urlsplit(domain)
        if parsed.hostname and parsed.hostname.endswith(".replit.dev"):
            return "http://localhost:80/api"
        return f"{parsed.scheme}://{parsed.netloc}/api"

    return "http://localhost:80/api"


def exchange_handoff(code: str) -> dict:
    response = requests.post(
        f"{api_base_url()}/streamlit/handoff/exchange",
        json={"code": code},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def get_evaluation(session: dict, threshold: str) -> dict:
    response = requests.get(
        f"{api_base_url()}/streamlit/engagements/{session['engagementId']}/fraud-evaluation",
        headers={"Authorization": f"Bearer {session['accessToken']}"},
        params={"threshold": threshold},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def metric_label(value: float | None) -> str:
    return "N/A" if value is None else f"{value * 100:.1f}%"


st.set_page_config(page_title="AuditIQ Fraud Evaluation", page_icon="📊", layout="wide")
st.title("Fraud evaluation")
st.caption("Compare risk-score predictions with auditor-reviewed outcomes.")

if SESSION_KEY not in st.session_state:
    handoff_code = st.query_params.get("handoff")
    if not handoff_code:
        st.warning("Open this page from an AuditIQ engagement to start a secure evaluation session.")
        st.link_button("Return to AuditIQ", "/")
        st.stop()

    try:
        st.session_state[SESSION_KEY] = exchange_handoff(handoff_code)
        st.query_params.clear()
    except requests.RequestException:
        st.error("The sign-in handoff could not be completed. Return to the engagement and open the evaluation page again.")
        st.link_button("Return to AuditIQ", "/")
        st.stop()

evaluation_session = st.session_state[SESSION_KEY]
st.caption(f"Engagement {evaluation_session['engagementId']} · Session expires in 15 minutes")

threshold = st.selectbox(
    "Prediction threshold",
    options=["MEDIUM", "HIGH"],
    format_func=lambda value: (
        "MEDIUM or higher (score ≥ 40)"
        if value == "MEDIUM"
        else "HIGH only (score ≥ 70)"
    ),
)

try:
    evaluation = get_evaluation(evaluation_session, threshold)
except requests.HTTPError as error:
    if error.response is not None and error.response.status_code == 401:
        st.session_state.pop(SESSION_KEY, None)
        st.error("This evaluation session has expired. Return to AuditIQ and open the evaluation page again.")
        st.link_button("Return to AuditIQ", "/")
    else:
        st.error("Could not load the fraud evaluation metrics.")
    st.stop()
except requests.RequestException:
    st.error("Could not reach the AuditIQ API. Try again in a moment.")
    st.stop()

metric_columns = st.columns(3)
for column, label, key in zip(
    metric_columns,
    ["Precision", "Recall", "F1"],
    ["precision", "recall", "f1"],
):
    column.metric(label, metric_label(evaluation[key]))

st.write(f"**{evaluation['evaluatedEntries']}** scored, labeled entries evaluated")
st.subheader("Confusion matrix")
st.table({
    "Actual / predicted": ["Confirmed fraud", "Legitimate"],
    "Fraud": [evaluation["truePositive"], evaluation["falsePositive"]],
    "Legitimate": [evaluation["falseNegative"], evaluation["trueNegative"]],
})

st.subheader("Review sample")
st.write(
    f"Confirmed fraud: {evaluation['confirmedFraudEntries']} · "
    f"Legitimate: {evaluation['legitimateEntries']} · "
    f"Inconclusive: {evaluation['inconclusiveEntries']} · "
    f"Unreviewed: {evaluation['unreviewedEntries']} · "
    f"Unscored: {evaluation['unscoredEntries']}"
)
st.caption(
    "Only confirmed fraud and legitimate outcomes with a risk score contribute to the metrics. "
    "Inconclusive, unreviewed, and unscored entries are excluded. Predictions use the underlying "
    "numeric score, not auditor-overridden risk categories."
)
st.link_button("Return to AuditIQ", "/")