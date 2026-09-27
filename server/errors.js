export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

export const badRequest = (message, fields) => new ApiError(400, message, fields)
export const notFound = () => new ApiError(404, 'Not found')
export const conflict = (message) => new ApiError(409, message)

export function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response)).catch(next)
}
