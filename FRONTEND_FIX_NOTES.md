# Frontend fix notes

This package fixes the frontend data-flow for the MPLADS dashboard.

Key changes:
- Local runs default to the verified FastAPI backend at http://127.0.0.1:8000.
- A previously saved Render URL is ignored when the app is opened on localhost/127.0.0.1, unless VITE_API_BASE_URL is explicitly set.
- Filtered project requests require all three numeric IDs: state_id, constituency_id, and mp_id.
- Filtered project requests are cache-busted to prevent stale browser/proxy responses.
- Apply Filters replaces the dashboard dataset with the selected jurisdiction's response.
- Stale/slow responses cannot overwrite a newer jurisdiction selection.
- Refresh/mode changes preserve an already-applied jurisdiction instead of silently loading the global dataset.
- Partial filters no longer fall back to the default 37-project dataset.

Backend files are not included/modified by this package; keep using the working FastAPI backend separately.
