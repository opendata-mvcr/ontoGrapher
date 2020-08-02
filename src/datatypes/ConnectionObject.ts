import {ProjectElements, ProjectLinks, ProjectSettings} from "../config/Variables";
import {getNewLink} from "../function/FunctionGraph";
import {addLink} from "../function/FunctionCreateVars";
import {updateConnections} from "../interface/TransactionInterface";

export class ConnectionObject {
	public onProperty: string;
	public target: string;

	constructor(onProperty: string, target: string) {
		this.onProperty = onProperty;
		this.target = target;
	}

	initConnection(source: string) {
		let src = Object.keys(ProjectElements).filter(id => ProjectElements[id].iri === source);
		let tgt = Object.keys(ProjectElements).filter(id => ProjectElements[id].iri === this.target);
		for (let srcElem of src) {
			for (let tgtElem of tgt) {
				let link = getNewLink();
				if (typeof link.id === "string" && !ProjectElements[srcElem].connections.find(conn =>
					ProjectLinks[conn].iri === this.onProperty &&
					ProjectElements[ProjectLinks[conn].target].iri === this.target
				)) {
					addLink(link.id, this.onProperty, srcElem, tgtElem);
					ProjectElements[srcElem].connections.push(link.id);
					updateConnections(ProjectSettings.contextEndpoint, link.id, [], ConnectionObject.name);
				}
			}
		}
	}
}