export type AccountingProviderHealth = {
  provider: string;
  enabled: false;
  state: "DISABLED";
  safeDetail: string;
};

export class DisabledAccountingProviderAdapter {
  readonly enabled = false as const;

  constructor(readonly provider = "UNCONFIGURED") {}

  health(): AccountingProviderHealth {
    return {
      provider: this.provider.slice(0, 64),
      enabled: false,
      state: "DISABLED",
      safeDetail: "External Accounting delivery is disabled in Phase 6.",
    };
  }

  async send(): Promise<never> {
    throw new Error("PROVIDER_DISABLED");
  }

  async authenticate(): Promise<never> {
    throw new Error("PROVIDER_AUTHENTICATION_DISABLED");
  }
}
