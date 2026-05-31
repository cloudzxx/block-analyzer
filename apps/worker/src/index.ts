interface Env {
  ORIGIN_SERVER: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = `http://${env.ORIGIN_SERVER}`

    const headers = new Headers(request.headers)
    headers.delete("host")

    const response = await fetch(`${origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: request.body,
    })

    const resp = new Response(response.body, response)
    resp.headers.set("Access-Control-Allow-Origin", "*")
    resp.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    resp.headers.set("Access-Control-Allow-Headers", "Content-Type")

    return resp
  },
}
