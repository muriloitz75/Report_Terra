function getBackendUrl(pathname: string, search: string) {
    const base = process.env.BACKEND_API_URL || "http://127.0.0.1:8000"
    return `${base}${pathname}${search || ""}`
}

async function proxy(req: Request, pathname: string) {
    const url = new URL(req.url)
    const targetUrl = getBackendUrl(pathname, url.search)

    const headers = new Headers(req.headers)
    headers.delete("host")

    const init: RequestInit = {
        method: req.method,
        headers,
        cache: "no-store",
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = await req.arrayBuffer()
    }

    const res = await fetch(targetUrl, init)
    const resHeaders = new Headers(res.headers)
    resHeaders.delete("content-encoding")
    resHeaders.delete("content-length")

    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
    })
}

type Context = { params: Promise<{ path: string[] }> }

export async function PATCH(req: Request, context: Context) {
    const { path } = await context.params
    return proxy(req, `/admin/users/${path.join("/")}`)
}

export async function DELETE(req: Request, context: Context) {
    const { path } = await context.params
    return proxy(req, `/admin/users/${path.join("/")}`)
}
