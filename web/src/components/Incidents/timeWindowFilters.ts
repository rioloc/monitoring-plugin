export const filterIncidentsByTimeWindow = (
  incidents: Array<any>,
  timeWindow: number,
  currentTime: number,
): Array<any> => {
  if (!incidents || !Array.isArray(incidents) || timeWindow === 0) {
    return incidents || [];
  }

  return incidents.filter((incident) => {
    if (!incident.values || !Array.isArray(incident.values) || incident.values.length === 0) {
      return false;
    }

    const endTime = incident.values[incident.values.length - 1][0];
    const delta = (currentTime - timeWindow) / 1000;

    return endTime >= delta;
  });
};

export const filterAlertsByTimeWindow = (
  alerts: Array<any>,
  timeWindow: number,
  currentTime: number,
): Array<any> => {
  if (!alerts || !Array.isArray(alerts) || timeWindow === 0) {
    return alerts || [];
  }

  return alerts.filter((alert) => {
    if (!alert.values || !Array.isArray(alert.values) || alert.values.length === 0) {
      return false;
    }

    const endTime = alert.values[alert.values.length - 1][0];
    const delta = (currentTime - timeWindow) / 1000;

    return endTime >= delta;
  });
};
