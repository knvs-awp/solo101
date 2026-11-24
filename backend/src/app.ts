import express from 'express';

export const app = express();

// the deploy health check calls this directly on the server
app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

// cloudfront forwards /api/* to the backend, so public routes are mounted here
export const api = express.Router();

api.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

// unknown api paths return json instead of express's html error page
api.use((_request, response) => {
  response.status(404).json({ error: 'not found' });
});

app.use('/api', api);
