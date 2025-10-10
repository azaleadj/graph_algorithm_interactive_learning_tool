declare module "react-cytoscapejs" {
    import React from "react";
    import cytoscape, { ElementsDefinition, Stylesheet } from "cytoscape";
  
    export interface CytoscapeComponentProps {
      elements: ElementsDefinition | cytoscape.ElementDefinition[];
      style?: React.CSSProperties;
      className?: string;
      stylesheet?: Stylesheet[];
      layout?: cytoscape.LayoutOptions;
      cy?: (cy: cytoscape.Core) => void;
    }
  
    const CytoscapeComponent: React.FC<CytoscapeComponentProps>;
    export default CytoscapeComponent;
  }
  