import axios from 'axios'

export const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
})

http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const status = err?.response?.status
    const msg = err?.response?.data?.detail || err?.message || '请求失败'

    // eslint-disable-next-line no-console
    console.error('API error', { status, msg, err })

    // Let UI decide how to toast; but keep a helpful redirect for 401.
    if (status === 401) {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?next=${next}`
      return
    }

    return Promise.reject(err)
  },
)
