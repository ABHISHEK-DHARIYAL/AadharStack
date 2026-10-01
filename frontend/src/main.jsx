import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AdminBim from './components/AdminBim.jsx'
import './index.css'

const admin = window.location.pathname.startsWith('/admin/bim')
createRoot(document.getElementById('root')).render(admin ? <AdminBim /> : <App />)
