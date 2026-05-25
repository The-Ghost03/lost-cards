import api from './axios'

export const getCsrfCookie  = ()       => api.get('/sanctum/csrf-cookie', { baseURL: '' })
export const register       = (data)   => api.post('/register', data)
export const login          = (data)   => api.post('/login', data)
export const logout         = ()       => api.post('/logout')
export const getMe          = ()       => api.get('/me')
export const updateStatus   = (status) => api.patch('/me/status', { status })
export const deleteAccount  = (pwd)    => api.delete('/me', { data: { password: pwd } })
export const forgotPassword = (email)  => api.post('/forgot-password', { email })
export const resetPassword  = (data)   => api.post('/reset-password', data)
