import type { DriveStep } from "driver.js";

export interface TourDef {
  id: string;
  title: string;
  steps: DriveStep[];
}

export const setupTour: TourDef = {
  id: "setup",
  title: "Getting Started",
  steps: [
    {
      element: "[data-tour='warehouse-selector']",
      popover: {
        title: "Select a Warehouse",
        description:
          "Choose your active warehouse. All data is scoped to this selection.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='project-selector']",
      popover: {
        title: "Select a Project",
        description:
          "Optionally filter by project to load its specific workflow.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='nav-warehouses']",
      popover: {
        title: "Manage Warehouses",
        description:
          "Create new warehouses, add locations, and configure zones.",
        side: "right",
      },
    },
    {
      element: "[data-tour='nav-workers']",
      popover: {
        title: "Add Workers",
        description: "Add your team members and assign roles.",
        side: "right",
      },
    },
  ],
};

export const workflowDesignerTour: TourDef = {
  id: "workflow-designer",
  title: "Workflow Designer",
  steps: [
    {
      element: "[data-tour='stage-palette']",
      popover: {
        title: "Stage Palette",
        description:
          "Drag stage types onto the canvas to build your workflow pipeline.",
        side: "right",
      },
    },
    {
      element: "[data-tour='workflow-canvas']",
      popover: {
        title: "Design Canvas",
        description:
          "Connect stages by dragging from one port to another. Each connection defines the flow.",
        side: "left",
      },
    },
    {
      element: "[data-tour='workflow-save']",
      popover: {
        title: "Save & Activate",
        description:
          "Save your workflow, then activate it to make it live for this warehouse.",
        side: "bottom",
      },
    },
  ],
};

export const operationsTour: TourDef = {
  id: "operations",
  title: "Operations Flow",
  steps: [
    {
      element: "[data-tour='nav-receiving']",
      popover: {
        title: "Receiving",
        description: "Start here. Receive inbound goods against purchase orders.",
        side: "right",
      },
    },
    {
      element: "[data-tour='nav-picking']",
      popover: {
        title: "Picking / Scanning",
        description: "Pick items from storage to fulfill outbound orders.",
        side: "right",
      },
    },
    {
      element: "[data-tour='nav-packing']",
      popover: {
        title: "Packing",
        description: "Pack picked items into containers for shipment.",
        side: "right",
      },
    },
    {
      element: "[data-tour='nav-shipping']",
      popover: {
        title: "Shipping",
        description: "Assign carriers, print labels, and dispatch shipments.",
        side: "right",
      },
    },
  ],
};

export const trackingTour: TourDef = {
  id: "tracking",
  title: "Tracking & Barcodes",
  steps: [
    {
      element: "[data-tour='scan-input']",
      popover: {
        title: "Scan a Barcode",
        description:
          "Enter or scan a barcode to look up an item's complete journey.",
        side: "bottom",
      },
    },
    {
      element: "[data-tour='journey-timeline']",
      popover: {
        title: "Journey Timeline",
        description:
          "See every event in the item's lifecycle, from receipt to shipment.",
        side: "left",
      },
    },
  ],
};

export const allTours: TourDef[] = [
  setupTour,
  workflowDesignerTour,
  operationsTour,
  trackingTour,
];
