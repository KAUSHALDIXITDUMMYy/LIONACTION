import { logger } from '../utils/logger'

/**
 * Prevents duplicate concurrent requests for the same sport
 * If multiple requests come in for the same sport simultaneously,
 * they share the same promise instead of making multiple API calls
 */
class RequestDeduplicationService {
  private pendingRequests: Map<string, Promise<any>> = new Map()

  async getOrCreateRequest<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Check if request already in flight
    const existingRequest = this.pendingRequests.get(key)
    if (existingRequest) {
      logger.debug('Request deduplication: reusing existing request', { key })
      return existingRequest as Promise<T>
    }

    // Create new request
    const requestPromise = fetchFn()
      .then((data) => {
        this.pendingRequests.delete(key)
        return data
      })
      .catch((error) => {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, requestPromise)
    logger.debug('Request deduplication: created new request', { key })

    return requestPromise
  }

  clear(): void {
    this.pendingRequests.clear()
    logger.info('Request deduplication cache cleared')
  }
}

export const requestDeduplicationService = new RequestDeduplicationService()

