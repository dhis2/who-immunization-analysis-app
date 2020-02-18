
import d2UtilsFactory from './d2Utils'


const d2Utils = d2UtilsFactory();


export default {
    /**
    * Merges the metadata from one or more request results into one result set.
    * @param newData {Array} 
    */
    mergeMetaData: (newData) => {
       //Create "skeleton" if it does not exist
       var meta = {
           co: [],
           dx: [],
           items: {},
           ouHierarchy: {},
           ou: [],
           pe: []
       };

       for (var i = 0; i < newData.length; i++) {
           var metaData = newData[i].metaData;

           //Transfer metadata
           meta.co.push.apply(meta.co, metaData.dimensions.co);
           meta.dx.push.apply(meta.dx, metaData.dimensions.dx);
           meta.ou.push.apply(meta.ou, metaData.dimensions.ou);
           meta.pe.push.apply(meta.pe, metaData.dimensions.pe);

           for (key in metaData.ouHierarchy) {
               if (metaData.ouHierarchy.hasOwnProperty(key)) {
                   meta.ouHierarchy[key] = metaData.ouHierarchy[key];
               }
           }		
           
           for (var key in metaData.items) {
               if (metaData.items.hasOwnProperty(key)) {
                   meta.items[key] = metaData.items[key];
               }
           }
       }

       //Remove duplicates in metaData
       meta.co = d2Utils.arrayRemoveDuplicates(meta.co);
       meta.dx = d2Utils.arrayRemoveDuplicates(meta.dx);
       meta.ou = d2Utils.arrayRemoveDuplicates(meta.ou);
       meta.pe = d2Utils.arrayRemoveDuplicates(meta.pe);

       //Clear the data we have now merged
       return meta;
   },


	/**
	 * Merges the data from the one or more request results into one global result set, which will be used
	 * for any subsequent requests for additional data.
	 *
	 * In cases where the format is different (e.g. one request is disaggergated and the other not),
	 * the "maximum" will be used and the missing fields will be empty.
     * 
     * @param oldData {object} The existing data to merge with
     * @param dataToMerge {Array} The new data to merge into oldData
	 */
	mergeAnalyticsResults: (oldData, dataToMerge) => {

		//Create "skeleton" if it does not exist
		if (!oldData) {
			oldData = {
				headers: [
					{name: "dx"},
					{name: "co"},
					{name: "ou"},
					{name: "pe"},
					{name: "value"},
					{name: "at"}
				],
				metaData: {
					co: [],
					dx: [],
					items: {},
					ouHierarchy: {},
					ou: [],
					pe: []
				},
				rows: []
			};
		}

		for (var i = 0; i < dataToMerge.length; i++) {
			var header = dataToMerge[i].headers;
			var metaData = dataToMerge[i].metaData;
			var rows = dataToMerge[i].rows;

			var dxi = null, pei = null, oui = null, coi = null, vali = null, ati = null;
			for (var j = 0; j < header.length; j++) {
				if (header[j].name === "dx" && !header[j].hidden) dxi = j;
				if (header[j].name === "ou" && !header[j].hidden) oui = j;
				if (header[j].name === "pe" && !header[j].hidden) pei = j;
				if (header[j].name === "co" && !header[j].hidden) coi = j;
				if (header[j].name === "value" && !header[j].hidden) vali = j;
				if (header[j].name === "at") ati = j;
			}

			//Transfer data to result object
			var transVal;
			for (var j = 0; j < rows.length; j++) {
				transVal = [];
				transVal[0] = rows[j][dxi];
				coi ? transVal[1] = rows[j][coi] : transVal[1] = null;
				ati ? transVal[5] = rows[j][ati] : transVal[5] = null;
				transVal[2] = rows[j][oui];
				transVal[3] = rows[j][pei];
				transVal[4] = rows[j][vali];

				oldData.rows.push(transVal);
			}

			//Transfer metadata
			oldData.metaData.co.push.apply(oldData.metaData.co, metaData.dimensions.co);
			oldData.metaData.dx.push.apply(oldData.metaData.dx, metaData.dimensions.dx);
			oldData.metaData.ou.push.apply(oldData.metaData.ou, metaData.dimensions.ou);
			oldData.metaData.pe.push.apply(oldData.metaData.pe, metaData.dimensions.pe);

			for (key in metaData.ouHierarchy) {
				if (metaData.ouHierarchy.hasOwnProperty(key)) {
					oldData.metaData.ouHierarchy[key] = metaData.ouHierarchy[key];
				}
			}
			for (var key in metaData.items) {
				if (metaData.items.hasOwnProperty(key)) {
					oldData.metaData.items[key] = metaData.items[key];
				}
			}
		}

		//Remove duplicates in metaData
		oldData.metaData.co = d2Utils.arrayRemoveDuplicates(oldData.metaData.co);
		oldData.metaData.dx = d2Utils.arrayRemoveDuplicates(oldData.metaData.dx);
		oldData.metaData.ou = d2Utils.arrayRemoveDuplicates(oldData.metaData.ou);
		oldData.metaData.pe = d2Utils.arrayRemoveDuplicates(oldData.metaData.pe);

		return oldData;
	}
}