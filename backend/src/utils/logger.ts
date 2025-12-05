type LogLevel = 'info' | 'error' | 'warn' | 'debug'

function formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(formatMessage('info', message, context))
  },
  error: (message: string, context?: Record<string, any>) => {
    console.error(formatMessage('error', message, context))
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(formatMessage('warn', message, context))
  },
  debug: (message: string, context?: Record<string, any>) => {
    console.debug(formatMessage('debug', message, context))
  },
}

