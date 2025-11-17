!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
I have not tested the frontend yet, therefore not the backend either, so proceed with caution! 9/22/25
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
IT IS NOW WORKING PROPERLY 9/22/25
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
10/1/25
It can only go from the Central Library to the Mavericks Activity Center. The MAC coords seems to be a bit off, but Central Library coords seem to be fine.
Will need to adjust the coords and provide more routes if possible.
Also, the route's directions are super incorrect, so need to fix that up to.
The UI text seems to be a little messed up too.

When deploying, set `VITE_API_BASE_URL` to the Cloud Run URL of the backend; during local development you can leave it unset and rely on the Vite dev proxy or the default `http://localhost:3001` fallback.
