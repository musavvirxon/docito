import { jsPDF } from "jspdf";

declare module "jspdf" {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

declare module "jspdf-autotable" {
  interface UserOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    theme?: "striped" | "grid" | "plain";
    headStyles?: {
      fillColor?: number[] | string;
      textColor?: number | number[] | string;
      fontSize?: number;
      fontStyle?: string;
    };
    bodyStyles?: {
      fontSize?: number;
      textColor?: number[] | string;
    };
    alternateRowStyles?: {
      fillColor?: number[] | string;
    };
    margin?: {
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    };
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
