# Cloud Storage Service

A full-stack cloud storage application that allows users to securely upload, manage, preview, download, share, replace, and restore files.

The application provides file and folder management, file sharing with Viewer and Editor permissions, trash management, search, storage management, and file version history.

## Features

- User authentication
- File upload
- File download
- File preview
- File and folder management
- File sharing
- Viewer and Editor permissions
- Search files
- Trash and restore
- Permanent file deletion
- File replacement
- File version history
- Restore previous file versions
- Storage management
## Technology Stack

### Frontend
- React.js
- Vite
- Axios
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy

### Database & Storage
- PostgreSQL
- Supabase Storage

### Tools
- Git
- GitHub
- Postman
- VS Code
## Project Structure

```text
cloud-storage-service/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── postman/
│
└── README.md
## Installation and Setup

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```
2. Create a Python virtual environment:
```bash
python -m venv venv
```
3. Activate the virtual environment on Windows:
```bash
venv\Scripts\activate
```
4. Install the backend dependencies:
```bash
pip install -r requirements.txt
```
5. Start the FastAPI backend:

```bash
uvicorn app.main:app --reload
```
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```
### Frontend Setup

1. Open a new terminal.

2. Navigate to the frontend directory:

```bash
cd frontend

3. Install frontend dependencies:

```bash
npm install

npm run dev

http://localhost:5173


