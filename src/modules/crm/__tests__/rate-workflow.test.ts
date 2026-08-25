import { describe, expect, it } from "vitest";
import {
  buildQuoteLineItemsFromWorkflow,
  createAdditionalChargeEntry,
  getCurrentFinalizedBuyRateVersion,
  getRateWorkflowSnapshot,
} from "../rate-workflow";
import { buildBestRateRecommendation } from "../services/best-rate-recommendation.service";
import { buildFinalizedBuyRateVersion } from "../services/finalized-buy-rate.service";
import { buildPricingSnapshot } from "../services/pricing-snapshot.service";
import { buildRateComparisonWorkspace } from "../services/rate-comparison.service";

describe("CRM rate workflow", () => {
  it("builds the import LCL seeded charge worksheet", () => {
    const snapshot = getRateWorkflowSnapshot({
      type: "Sea",
      seaType: "Import",
      seaLclFcl: "LCL",
    });

    expect(snapshot.chargeContext.scenarioKey).toBe("IMPORT_LCL");
    expect(snapshot.freightCharges.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "OCEAN_FREIGHT",
        "ORIGIN_CFS",
        "LCL",
        "CFS",
        "TRANSPORTATION",
      ]),
    );
    expect(snapshot.customsCharges.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["DO", "CUSTOM_CLEARANCE", "DOCUMENTATION"]),
    );
  });

  it("preserves additional charges across scenario recalculation", () => {
    const additionalCharge = createAdditionalChargeEntry({
      department: "FREIGHT_FORWARDING",
      name: "Weekend surcharge",
      unit: "BL",
      amount: 1250,
      displayOrder: 99,
    });

    const snapshot = getRateWorkflowSnapshot({
      type: "Sea",
      seaType: "Export",
      seaLclFcl: "FCL",
      rateWorkflow: {
        freightCharges: [additionalCharge],
      },
    });

    const preserved = snapshot.freightCharges.find(
      (entry) => entry.code === additionalCharge.code,
    );

    expect(snapshot.chargeContext.scenarioKey).toBe("EXPORT_FCL");
    expect(preserved).toMatchObject({
      name: "Weekend surcharge",
      amount: 1250,
      source: "ADDITIONAL",
    });
    expect(snapshot.freightCharges.map((entry) => entry.code)).toContain("VGM");
  });

  it("builds a best-rate recommendation from comparable responses", () => {
    const enquiryDetails = {
      type: "Sea",
      seaType: "Export",
      seaLclFcl: "FCL",
      weight: "12000",
      rateWorkflow: {
        rateResponses: [
          {
            id: "resp-a",
            requestId: "req-a",
            vendorId: "vendor-a",
            vendorName: "Agent A",
            messageId: "msg-a",
            threadId: "thr-a",
            receivedAt: "2026-08-24T10:00:00.000Z",
            currency: "INR",
            validity: "2026-09-10",
            carrier: "Carrier A",
            routing: "MAA-HAM",
            transit: "18 days",
            remarks: null,
            standardRateSignal: null,
            parserStatus: "MANUAL",
            parserModel: null,
            parserRunAt: null,
            overallConfidence: 0.9,
            sources: [],
            warnings: [],
            lines: [
              {
                id: "a-ocean",
                canonicalChargeCode: "OCEAN_FREIGHT",
                canonicalChargeName: "Ocean Freight",
                originalDescription: "Ocean Freight",
                amount: 90000,
                amountSourceText: "90000",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: "GST 18%",
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-thc",
                canonicalChargeCode: "THC",
                canonicalChargeName: "THC",
                originalDescription: "THC",
                amount: 7000,
                amountSourceText: "7000",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-bl",
                canonicalChargeCode: "BL",
                canonicalChargeName: "BL",
                originalDescription: "BL",
                amount: 2500,
                amountSourceText: "2500",
                amountMissing: false,
                currency: "INR",
                unit: "BL",
                quantityBasis: "Per BL",
                quantityText: null,
                containerText: null,
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-customs",
                canonicalChargeCode: "CUSTOM_CLEARANCE",
                canonicalChargeName: "Custom clearance",
                originalDescription: "Custom clearance",
                amount: 8500,
                amountSourceText: "8500",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
            ],
            createdById: "user-1",
            updatedAt: "2026-08-24T10:00:00.000Z",
          },
          {
            id: "resp-b",
            requestId: "req-b",
            vendorId: "vendor-b",
            vendorName: "Agent B",
            messageId: "msg-b",
            threadId: "thr-b",
            receivedAt: "2026-08-24T11:00:00.000Z",
            currency: "INR",
            validity: "2026-08-28",
            carrier: "Carrier B",
            routing: "MAA-HAM",
            transit: "15 days",
            remarks: null,
            standardRateSignal: null,
            parserStatus: "MANUAL",
            parserModel: null,
            parserRunAt: null,
            overallConfidence: 0.82,
            sources: [],
            warnings: [],
            lines: [
              {
                id: "b-ocean",
                canonicalChargeCode: "OCEAN_FREIGHT",
                canonicalChargeName: "Ocean Freight",
                originalDescription: "Ocean Freight",
                amount: 88000,
                amountSourceText: "88000",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: "GST 18%",
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.82,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
            ],
            createdById: "user-1",
            updatedAt: "2026-08-24T11:00:00.000Z",
          },
        ],
      },
    };

    const snapshot = getRateWorkflowSnapshot(enquiryDetails);
    const recommendation = buildBestRateRecommendation({
      workspace: buildRateComparisonWorkspace({
        workflow: snapshot,
        enquiryDetails,
      }),
      profileByVendorId: new Map([
        [
          "vendor-a",
          {
            rank: 1,
            recommended: true,
            explanation: "Top fit",
            metrics: {
              similarEnquiryCount: 12,
              requestCount: 20,
              responseRatePct: 95,
              medianResponseMinutes: 40,
              completeRatePct: 92,
              clarificationRatePct: 10,
              competitivenessPct: 80,
              selectionRatePct: 75,
              bookingRatePct: 65,
              operationalOutcomePct: 70,
              disputePct: null,
              billingVariancePct: null,
              rateValidityQualityPct: 88,
            },
          },
        ],
        [
          "vendor-b",
          {
            rank: 2,
            recommended: false,
            explanation: "Lower completeness",
            metrics: {
              similarEnquiryCount: 8,
              requestCount: 15,
              responseRatePct: 85,
              medianResponseMinutes: 90,
              completeRatePct: 50,
              clarificationRatePct: 22,
              competitivenessPct: 75,
              selectionRatePct: 50,
              bookingRatePct: 40,
              operationalOutcomePct: 45,
              disputePct: null,
              billingVariancePct: null,
              rateValidityQualityPct: 60,
            },
          },
        ],
      ]),
    });

    expect(recommendation).not.toBeNull();
    expect(recommendation?.recommendedMode).toBe("ENTIRE_AGENT");
    expect(recommendation?.recommendedResponseId).toBe("resp-a");
    expect(recommendation?.decision.status).toBe("PENDING");
    expect(recommendation?.reasons.length).toBeGreaterThan(0);
  });

  it("builds a versioned finalized buy-rate snapshot from an accepted recommendation", () => {
    const enquiryDetails = {
      type: "Sea",
      seaType: "Export",
      seaLclFcl: "FCL",
      weight: "12000",
      rateWorkflow: {
        rateRecommendation: {
          generatedAt: "2026-08-24T12:00:00.000Z",
          model: "weighted-commercial-recommendation-v1",
          strategy: "DETERMINISTIC",
          recommendedMode: "ENTIRE_AGENT",
          recommendedResponseId: "resp-a",
          recommendedChargeSelections: [],
          recommendedTotalInBaseCurrency: 105900,
          recommendedVendorIds: ["vendor-a"],
          confidenceScore: 0.91,
          explanation: "Recommended Agent A.",
          reasons: [{ label: "Cost", detail: "Lowest complete total." }],
          decision: {
            status: "ACCEPTED",
            decidedAt: "2026-08-24T12:05:00.000Z",
            decidedById: "user-1",
            selectedMode: "ENTIRE_AGENT",
            selectedResponseId: "resp-a",
            selectedChargeSelections: [],
            overrideReasons: [],
            overrideNote: null,
          },
        },
        rateResponses: [
          {
            id: "resp-a",
            requestId: "req-a",
            vendorId: "vendor-a",
            vendorName: "Agent A",
            messageId: "msg-a",
            threadId: "thr-a",
            receivedAt: "2026-08-24T10:00:00.000Z",
            currency: "INR",
            validity: "2026-09-10",
            carrier: "Carrier A",
            routing: "MAA-HAM",
            transit: "18 days",
            remarks: null,
            standardRateSignal: null,
            parserStatus: "MANUAL",
            parserModel: null,
            parserRunAt: null,
            overallConfidence: 0.9,
            sources: [],
            warnings: [],
            lines: [
              {
                id: "a-ocean",
                canonicalChargeCode: "OCEAN_FREIGHT",
                canonicalChargeName: "Ocean Freight",
                originalDescription: "Ocean Freight",
                amount: 90000,
                amountSourceText: "90000",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: "GST 18%",
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-thc",
                canonicalChargeCode: "THC",
                canonicalChargeName: "THC",
                originalDescription: "THC",
                amount: 7000,
                amountSourceText: "7000",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-bl",
                canonicalChargeCode: "BL",
                canonicalChargeName: "BL",
                originalDescription: "BL",
                amount: 2500,
                amountSourceText: "2500",
                amountMissing: false,
                currency: "INR",
                unit: "BL",
                quantityBasis: "Per BL",
                quantityText: null,
                containerText: null,
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-customs",
                canonicalChargeCode: "CUSTOM_CLEARANCE",
                canonicalChargeName: "Custom clearance",
                originalDescription: "Custom clearance",
                amount: 8500,
                amountSourceText: "8500",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
            ],
            createdById: "user-1",
            updatedAt: "2026-08-24T10:00:00.000Z",
          },
        ],
      },
    };

    const snapshot = getRateWorkflowSnapshot(enquiryDetails);
    const version = buildFinalizedBuyRateVersion({
      workflow: snapshot,
      enquiryDetails,
      createdById: "user-1",
      notes: "Approved after supplier call review.",
    });
    const hydratedSnapshot = getRateWorkflowSnapshot({
      ...enquiryDetails,
      rateWorkflow: {
        ...(enquiryDetails.rateWorkflow || {}),
        finalizedBuyRateVersions: [version],
        currentFinalizedBuyRateVersionId: version.id,
        costingLocked: false,
      },
    });

    expect(version.versionLabel).toBe("R1");
    expect(version.selectedMode).toBe("ENTIRE_AGENT");
    expect(version.lines.length).toBeGreaterThan(0);
    expect(version.totalInBaseCurrency).toBeGreaterThan(0);
    expect(getCurrentFinalizedBuyRateVersion(hydratedSnapshot)?.id).toBe(version.id);
    expect(hydratedSnapshot.costingLocked).toBe(false);
  });

  it("builds a pricing snapshot from the finalized buy-rate version and seeds quotes from sell rates", () => {
    const enquiryDetails = {
      type: "Sea",
      seaType: "Export",
      seaLclFcl: "FCL",
      weight: "12000",
      rateWorkflow: {
        rateRecommendation: {
          generatedAt: "2026-08-24T12:00:00.000Z",
          model: "weighted-commercial-recommendation-v1",
          strategy: "DETERMINISTIC",
          recommendedMode: "ENTIRE_AGENT",
          recommendedResponseId: "resp-a",
          recommendedChargeSelections: [],
          recommendedTotalInBaseCurrency: 105900,
          recommendedVendorIds: ["vendor-a"],
          confidenceScore: 0.91,
          explanation: "Recommended Agent A.",
          reasons: [{ label: "Cost", detail: "Lowest complete total." }],
          decision: {
            status: "ACCEPTED",
            decidedAt: "2026-08-24T12:05:00.000Z",
            decidedById: "user-1",
            selectedMode: "ENTIRE_AGENT",
            selectedResponseId: "resp-a",
            selectedChargeSelections: [],
            overrideReasons: [],
            overrideNote: null,
          },
        },
        rateResponses: [
          {
            id: "resp-a",
            requestId: "req-a",
            vendorId: "vendor-a",
            vendorName: "Agent A",
            messageId: "msg-a",
            threadId: "thr-a",
            receivedAt: "2026-08-24T10:00:00.000Z",
            currency: "INR",
            validity: "2026-09-10",
            carrier: "Carrier A",
            routing: "MAA-HAM",
            transit: "18 days",
            remarks: null,
            standardRateSignal: null,
            parserStatus: "MANUAL",
            parserModel: null,
            parserRunAt: null,
            overallConfidence: 0.9,
            sources: [],
            warnings: [],
            lines: [
              {
                id: "a-ocean",
                canonicalChargeCode: "OCEAN_FREIGHT",
                canonicalChargeName: "Ocean Freight",
                originalDescription: "Ocean Freight",
                amount: 90000,
                amountSourceText: "90000",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: "GST 18%",
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
              {
                id: "a-customs",
                canonicalChargeCode: "CUSTOM_CLEARANCE",
                canonicalChargeName: "Custom clearance",
                originalDescription: "Custom clearance",
                amount: 8500,
                amountSourceText: "8500",
                amountMissing: false,
                currency: "INR",
                unit: "CONTAINER",
                quantityBasis: "Per container",
                quantityText: null,
                containerText: "40HC",
                minimumCharge: null,
                taxText: null,
                freeDaysText: null,
                inclusionStatus: "EXCLUDED",
                notes: null,
                confidenceScore: 0.9,
                confidenceLabel: "HIGH",
                reviewStatus: "AUTO_MAPPED",
                missingFields: [],
                standardRateReference: null,
                evidence: [],
              },
            ],
            createdById: "user-1",
            updatedAt: "2026-08-24T10:00:00.000Z",
          },
        ],
      },
    };

    const snapshot = getRateWorkflowSnapshot(enquiryDetails);
    const finalizedVersion = buildFinalizedBuyRateVersion({
      workflow: snapshot,
      enquiryDetails,
      createdById: "user-1",
    });
    const pricingWorkflow = getRateWorkflowSnapshot({
      ...enquiryDetails,
      rateWorkflow: {
        ...(enquiryDetails.rateWorkflow || {}),
        finalizedBuyRateVersions: [finalizedVersion],
        currentFinalizedBuyRateVersionId: finalizedVersion.id,
        costingLocked: false,
      },
    });
    const oceanLine = finalizedVersion.lines.find((line) => line.chargeCode === "OCEAN_FREIGHT");
    expect(oceanLine).toBeTruthy();

    const pricingSnapshot = buildPricingSnapshot({
      workflow: pricingWorkflow,
      updatedById: "user-1",
      notes: "Initial customer-facing sell rates.",
      lines: [
        {
          finalizedLineId: oceanLine?.id ?? "",
          sellAmount: 102000,
          quantity: 1,
          notes: "Raised to cover booking contingency.",
        },
      ],
    });

    const quoteSeed = buildQuoteLineItemsFromWorkflow({
      enquiryDetails: {
        ...enquiryDetails,
        rateWorkflow: {
          ...(enquiryDetails.rateWorkflow || {}),
          finalizedBuyRateVersions: [finalizedVersion],
          currentFinalizedBuyRateVersionId: finalizedVersion.id,
          pricingSnapshot,
          costingLocked: false,
        },
      },
      mode: "combined",
    });

    expect(pricingSnapshot.basedOnFinalizedVersionId).toBe(finalizedVersion.id);
    expect(pricingSnapshot.totals.sellAmount).toBeGreaterThan(pricingSnapshot.totals.buyAmount);
    expect(pricingSnapshot.lines.some((line) => line.sellAmount === 102000)).toBe(true);
    expect(quoteSeed.items.some((item) => item.rate === 102000)).toBe(true);
  });
});
