import api from './axios'

export const getPosts       = (params) => api.get('/posts', { params })
export const getPost        = (id)     => api.get(`/posts/${id}`)
export const createPost     = (data)   => api.post('/posts', data)
export const markRecovered  = (id)     => api.patch(`/posts/${id}/recover`)
export const deletePost     = (id)     => api.delete(`/posts/${id}`)

export const submitContact  = (postId, formData) =>
  api.post(`/posts/${postId}/contact`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getSelfie = (postId, requestId) =>
  api.get(`/posts/${postId}/contact/${requestId}/selfie`, { responseType: 'blob' })

export const rejectContact = (postId, requestId) =>
  api.patch(`/posts/${postId}/contact/${requestId}/reject`)

export const getContactRequests = (postId) =>
  api.get(`/posts/${postId}/contact`)

export const approveContact = (postId, requestId) =>
  api.patch(`/posts/${postId}/contact/${requestId}/approve`)
