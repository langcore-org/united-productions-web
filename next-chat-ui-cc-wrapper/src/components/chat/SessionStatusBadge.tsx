'use client';

type SessionStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped';

interface SessionStatusBadgeProps {
  status: SessionStatus;
  isReconnecting: boolean;
  bufferedEventsCount: number;
}

export function SessionStatusBadge({
  status,
  isReconnecting,
  bufferedEventsCount,
}: SessionStatusBadgeProps) {
  // Don't show badge for idle status
  if (status === 'idle' && !isReconnecting) {
    return null;
  }

  const getStatusConfig = () => {
    if (isReconnecting) {
      return {
        label: 'Reconnecting',
        subLabel: bufferedEventsCount > 0 ? `${bufferedEventsCount} buffered events` : 'Fetching updates...',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        dotColor: 'bg-yellow-500',
        animate: true,
      };
    }

    switch (status) {
      case 'running':
        return {
          label: 'Running in background',
          subLabel: 'Press ESC to stop',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-700 dark:text-blue-300',
          dotColor: 'bg-blue-500',
          animate: true,
        };
      case 'completed':
        return {
          label: 'Completed',
          subLabel: null,
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-700 dark:text-green-300',
          dotColor: 'bg-green-500',
          animate: false,
        };
      case 'error':
        return {
          label: 'Error',
          subLabel: 'Session encountered an error',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          textColor: 'text-red-700 dark:text-red-300',
          dotColor: 'bg-red-500',
          animate: false,
        };
      case 'stopped':
        return {
          label: 'Stopped',
          subLabel: 'Session was stopped',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          dotColor: 'bg-gray-500',
          animate: false,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`${config.bgColor} ${config.textColor} px-4 py-2 flex items-center gap-2 text-sm`}>
      <span className={`relative flex h-2 w-2`}>
        {config.animate && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotColor} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      </span>
      <span className="font-medium">{config.label}</span>
      {config.subLabel && (
        <span className="opacity-75">· {config.subLabel}</span>
      )}
    </div>
  );
}
