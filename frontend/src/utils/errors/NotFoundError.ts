import { AppError } from './AppError'

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND_ERROR', 404)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}
