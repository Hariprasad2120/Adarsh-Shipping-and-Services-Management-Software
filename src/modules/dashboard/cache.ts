type DashboardMetricScope = {
  orgId?: string;
  userId?: string;
};

let invalidateRegisteredCache: (scope?: DashboardMetricScope) => void = () => {};

export function registerDashboardMetricCacheInvalidator(
  invalidator: (scope?: DashboardMetricScope) => void,
) {
  invalidateRegisteredCache = invalidator;
}

export function invalidateDashboardMetricSnapshots(scope?: DashboardMetricScope) {
  invalidateRegisteredCache(scope);
}
