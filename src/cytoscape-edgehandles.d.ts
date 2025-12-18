declare module "cytoscape-edgehandles" {
    const ext: any;
    export = ext;
  }
  
  declare namespace cytoscape {
    interface EdgeHandlesOptions {
      handleSize?: number;
      snap?: boolean;
      noEdgeEventsInDraw?: boolean;
      edgeType?: (sourceNode: any, targetNode: any) => string;
      complete?: (sourceNode: any, targetNode: any, addedEdge: any) => void;
    }
  
    interface Core {
      edgehandles(options?: EdgeHandlesOptions): any;
    }
  }
   