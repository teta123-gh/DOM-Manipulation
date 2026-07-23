import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import routes from './src/routes/index.routes.js';
import errorHandler from './src/middlewares/errorHandler.middleware.js';


const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));
app.use(errorHandler);


export default app;