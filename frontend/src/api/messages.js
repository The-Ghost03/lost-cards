import api from './axios'

export const getConversations = ()        => api.get('/conversations')
export const getMessages      = (postId)  => api.get(`/conversations/${postId}/messages`)
export const sendMessage      = (postId, content) =>
  api.post(`/conversations/${postId}/messages`, { content })
