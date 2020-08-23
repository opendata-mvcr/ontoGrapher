import {
	Diagrams,
	Prefixes,
	ProjectElements,
	ProjectLinks,
	ProjectSettings,
	Schemes,
	VocabularyElements
} from "../config/Variables";
import {getRestrictionsAsJSON} from "../function/FunctionRestriction";
import {Restrictions} from "../config/Restrictions";
import {LinkConfig} from "../config/LinkConfig";

export async function updateProjectElement(
	contextEndpoint: string,
	source: string,
	newTypes: string[],
	newLabels: { [key: string]: string },
	newDefinitions: { [key: string]: string },
	id: string): Promise<boolean> {
	let iri = ProjectElements[id].iri;
	let scheme = VocabularyElements[iri].inScheme;
	let delTypes = VocabularyElements[iri].types;
	let addRestrictions: { [key: string]: any } = {};
	let addDefinitions: { "@value": string, "@language": string }[] = [];
	let addLabels: { "@value": string, "@language": string }[] = [];

	Object.keys(newLabels).forEach((lang) => {
		if (newLabels[lang] !== "") addLabels.push({"@value": newLabels[lang], "@language": lang});
	})

	Object.keys(newDefinitions).forEach((lang) => {
		if (newDefinitions[lang] !== "") addDefinitions.push({"@value": newDefinitions[lang], "@language": lang});
	})

	Object.keys(Restrictions).forEach((restriction) => {
		addRestrictions[restriction] = {"@type": "@id"};
	})

	ProjectSettings.lastSource = source;

	let addLD = {
		"@context": {
			...Prefixes,
			"skos:inScheme": {"@type": "@id"},
			"og:diagram": {"@type": "@id"},
			"og:attribute": {"@type": "@id"},
			"og:property": {"@type": "@id"},
			"og:iri": {"@type": "@id"},
			"og:context": {"@type": "@id"},
			"http://www.w3.org/2002/07/owl#onProperty": {"@type": "@id"},
			...addRestrictions
		},
		"@id": Schemes[scheme].graph,
		"@graph": [
			{
				"@id": iri,
				"@type": newTypes,
				"skos:prefLabel": addLabels,
				"skos:definition": addDefinitions,
				"skos:inScheme": scheme,
				"rdfs:subClassOf": getRestrictionsAsJSON(iri)
			},
			{
				"@id": iri + "/diagram",
				"@type": "og:element",
				"og:context": ProjectSettings.contextIRI,
				"og:id": id,
				"og:iri": iri,
				"og:untitled": ProjectElements[id].untitled,
				"og:diagram": ProjectElements[id].diagrams.map((diag) => (iri + "/diagram-" + (diag + 1))),
				"og:active": ProjectElements[id].active,
			},
			...ProjectElements[id].diagrams.map(diag => {
				return {
					"@id": iri + "/diagram-" + (diag + 1),
					"@type": "og:elementDiagram",
					"og:index": diag,
					"og:position-x": ProjectElements[id].position[diag].x,
					"og:position-y": ProjectElements[id].position[diag].y,
					"og:hidden": ProjectElements[id].hidden[diag]
				}
			}),
		]
	}

	let deleteLD = {
		"@context": {
			...Prefixes,
			"skos:inScheme": {"@type": "@id"},
			"og:diagram": {"@type": "@id"},
			"og:attribute": {"@type": "@id"},
			"og:property": {"@type": "@id"},
			"og:iri": {"@type": "@id"},
			"owl:onProperty": {"@type": "@id"}
		},
		"@id": Schemes[scheme].graph,
		"@graph": [
			{
				"@id": iri,
				"@type": delTypes,
				"skos:prefLabel": Object.keys(VocabularyElements[iri].labels).map(lang => {
					return {
						"@value": VocabularyElements[iri].labels[lang],
						"@language": lang
					}
				}),
				"skos:definition": Object.keys(VocabularyElements[iri].definitions).map(lang => {
					return {
						"@value": VocabularyElements[iri].definitions[lang],
						"@language": lang
					}
				}),
				"skos:inScheme": scheme,
			}
		]
	}

	// let delRestrictions = await processGetTransaction(contextEndpoint, {
	// 	subject: iri,
	// 	predicate: encodeURIComponent(parsePrefix("rdfs", "subClassOf"))
	// }).catch(() => false);
	// if (typeof delRestrictions === "string") {
	// 	await processTransaction(contextEndpoint, {"delete": JSON.parse(delRestrictions)}).catch(() => false);
	// } else return false;

	let delString = await processGetTransaction(contextEndpoint, {subject: iri + "/diagram"}).catch(() => false);
	if (typeof delString === "string") {
		await processTransaction(contextEndpoint, {"delete": JSON.parse(delString)}).catch(() => false);
	} else return false;

	for (const restr of VocabularyElements[iri].restrictions) {
		let i = VocabularyElements[iri].restrictions.indexOf(restr);
		let delString = await processGetTransaction(contextEndpoint, {subject: iri + "/restriction-" + (i + 1)}).catch(() => false);
		if (typeof delString === "string") {
			await processTransaction(contextEndpoint, {"delete": JSON.parse(delString)}).catch(() => false);
		} else return false;
	}

	for (const diag of ProjectElements[id].diagrams) {
		let delString = await processGetTransaction(contextEndpoint, {subject: iri + "/diagram-" + (diag + 1)}).catch(() => false);
		if (typeof delString === "string") {
			await processTransaction(contextEndpoint, {"delete": JSON.parse(delString)}).catch(() => false);
		}
	}
	return await processTransaction(contextEndpoint, {"add": addLD, "delete": deleteLD, "source": source});
}

export async function updateProjectLink(contextEndpoint: string, id: string, source: string) {
	let ogContext = "http://onto.fel.cvut.cz/ontologies/application/ontoGrapher";
	let linkIRI = ogContext + "-" + id;
	let cardinalities: { [key: string]: string } = {};
	if (ProjectLinks[id].sourceCardinality) {
		cardinalities["og:sourceCardinality1"] = ProjectLinks[id].sourceCardinality.getFirstCardinality();
		cardinalities["og:sourceCardinality2"] = ProjectLinks[id].sourceCardinality.getSecondCardinality();
	}
	if (ProjectLinks[id].targetCardinality) {
		cardinalities["og:targetCardinality1"] = ProjectLinks[id].targetCardinality.getFirstCardinality();
		cardinalities["og:targetCardinality2"] = ProjectLinks[id].targetCardinality.getSecondCardinality();
	}

	ProjectSettings.lastSource = source;
	let addLD = {
		"@context": {
			...Prefixes,
			"og:iri": {"@type": "@id"},
			"og:source": {"@type": "@id"},
			"og:target": {"@type": "@id"},
			"og:context": {"@type": "@id"},
		},
		"@id": ogContext,
		"@graph": [{
			"@id": linkIRI,
			"@type": "og:link",
			"og:id": id,
			"og:context": ProjectSettings.contextIRI,
			"og:iri": ProjectLinks[id].iri,
			"og:source-id": ProjectLinks[id].source,
			"og:target-id": ProjectLinks[id].target,
			"og:source": ProjectElements[ProjectLinks[id].source].iri,
			"og:target": ProjectElements[ProjectLinks[id].target].iri,
			"og:type": ProjectLinks[id].type,
			...cardinalities
		}
		]
	}

	let del = await processGetTransaction(contextEndpoint, {subject: linkIRI}).catch(() => false);
	if (typeof del === "string") {
		let deleteLD = JSON.parse(del);
		await processTransaction(contextEndpoint, {"delete": deleteLD, "source": source}).catch(() => false);
	}

	return await processTransaction(contextEndpoint, {"add": addLD, "source": source}).catch(() => false);
}

export async function updateDeleteProjectElement(contextEndpoint: string, iri: string, source: string) {
	ProjectSettings.lastSource = source;
	let subjectLD = await processGetTransaction(contextEndpoint, {subject: iri}).catch(() => false);
	let predicateLD = await processGetTransaction(contextEndpoint, {predicate: iri}).catch(() => false);
	let objectLD = await processGetTransaction(contextEndpoint, {object: iri}).catch(() => false);
	if (typeof subjectLD === "string" && typeof predicateLD === "string" && typeof objectLD === "string") {
		subjectLD = JSON.parse(subjectLD);
		predicateLD = JSON.parse(predicateLD);
		objectLD = JSON.parse(objectLD);
		return await processTransaction(contextEndpoint, {"delete": subjectLD, source: source}) &&
			await processTransaction(contextEndpoint, {"delete": predicateLD, source: source}) &&
			await processTransaction(contextEndpoint, {"delete": objectLD, source: source});
	} else return false;

}

//id: link ID
export async function updateConnections(contextEndpoint: string, id: string, del: string[], source: string) {
	ProjectSettings.lastSource = source;

	let addLD = LinkConfig[ProjectLinks[id].type].add(id);
	let deleteLD = LinkConfig[ProjectLinks[id].type].delete(id, del);

	if (del.length > 0) return await processTransaction(contextEndpoint, {
		"add": addLD,
		"delete": deleteLD
	});
	else return await processTransaction(contextEndpoint, {"add": addLD});
}

export function getTransactionID(contextEndpoint: string) {
	return new Promise((resolve, reject) => {
		let transactionUrl = contextEndpoint + "/transactions";
		fetch(transactionUrl, {
			headers: {
				'Content-Type': 'application/json'
			},
			method: "POST"
		}).then(response => response.headers).then(
			headers => resolve(headers.get("location"))
		).catch((error) => {
			reject(error);
		});
	})
}

export async function processGetTransaction(contextEndpoint: string, request: { subject?: string, predicate?: string, object?: string }) {
	const transactionID = await getTransactionID(contextEndpoint);

	if (transactionID) {
		let transactionUrl = transactionID + "?action=GET" +
			(request.subject ? "&subj=<" + (request.subject) + ">" : "") +
			(request.predicate ? "&pred=<" + (request.predicate) + ">" : "") +
			(request.object ? "&obj=<" + (request.object) + ">" : "");
		return await fetch(transactionUrl, {
			headers: {'Accept': "application/ld+json"},
			method: "PUT"
		}).then(response => response.text()).catch(() => {
			return null;
		});
	} else return null;
}

export async function processTransaction(contextEndpoint: string, transactions: { [key: string]: any }): Promise<boolean> {
	ProjectSettings.lastUpdate = transactions;
	const transactionID = await getTransactionID(contextEndpoint);

	if (transactionID) {
		let resultAdd, resultDelete, resultCommit;
		if (transactions.delete) {
			resultDelete = await fetch(transactionID + "?action=DELETE", {
				headers: {
					'Content-Type': 'application/ld+json'
				},
				method: "PUT",
				body: JSON.stringify(transactions.delete)
			}).then(response => response.ok)
		}

		if (transactions.add) {
			resultAdd = await fetch(transactionID + "?action=ADD", {
				headers: {
					'Content-Type': 'application/ld+json'
				},
				method: "PUT",
				body: JSON.stringify(transactions.add)
			}).then(response => response.ok)
		}

		resultCommit = await fetch(transactionID + "?action=COMMIT", {
			headers: {
				'Content-Type': 'application/json'
			},
			method: "PUT"
		}).then(response => response.ok)

		return ((resultAdd ? resultAdd : true) && (resultDelete ? resultDelete : true) && resultCommit);
	} else return false;
}

export async function updateProjectSettings(contextIRI: string, contextEndpoint: string, source: string) {
	ProjectSettings.lastSource = source;
	let ogContext = "http://onto.fel.cvut.cz/ontologies/application/ontoGrapher"

	let contextLD = {
		"@context": {
			...Prefixes,
			"d-sgov-pracovní-prostor-pojem:aplikační-kontext": {"@type": "@id"},
			"d-sgov-pracovní-prostor-pojem:odkazuje-na-kontext": {"@type": "@id"}
		},
		"@id": contextIRI,
		"@graph": [{
			"@id": contextIRI,
			"d-sgov-pracovní-prostor-pojem:odkazuje-na-kontext": ogContext
		}, {
			"@id": ogContext,
			"@type": "d-sgov-pracovní-prostor-pojem:aplikační-kontext"
		}]
	}

	let contextInstance = ProjectSettings.contextIRI.substring(ProjectSettings.contextIRI.lastIndexOf("/"));

	let ogContextLD = {
		"@context": {
			...Prefixes,
			"og:diagram": {"@type": "@id"},
			"d-sgov-pracovní-prostor-pojem:aplikační-kontext": {"@type": "@id"},
			"og:context": {"@type": "@id"}
		},
		"@id": ogContext,
		"@graph": [
			{
				"@id": ogContext,
				"@type": "d-sgov-pracovní-prostor-pojem:aplikační-kontext",
				"d-sgov-pracovní-prostor-pojem:aplikační-kontext": contextIRI,
			},
			{
				"@id": ogContext + contextInstance,
				"og:context": contextIRI,
				"og:selectedDiagram": ProjectSettings.selectedDiagram,
				"og:selectedLanguage": ProjectSettings.selectedLanguage,
				"og:diagram": Diagrams.map((diag, i) => ogContext + contextInstance + "/diagram-" + (i + 1)),
				"og:initialized": true
			},
			...(Diagrams).filter(diag => diag.active).map((diag, i) => {
				return {
					"@id": ogContext + contextInstance + "/diagram-" + (i + 1),
					"og:index": i,
					"og:context": contextIRI,
					"og:name": diag.name,
				}
			})
		]
	}

	let delString = await processGetTransaction(ProjectSettings.contextEndpoint, {subject: ogContext}).catch(() => false);
	if (typeof delString === "string") {
		await processTransaction(ProjectSettings.contextEndpoint, {
			"delete": JSON.parse(delString),
			"source": source
		}).catch(() => false);
	}

	for (const diag of Diagrams) {
		let i = Diagrams.indexOf(diag);
		let delString = await processGetTransaction(contextEndpoint, {subject: ogContext + "/diagram-" + (i + 1)}).catch(() => false);
		if (typeof delString === "string") {
			await processTransaction(contextEndpoint, {"delete": JSON.parse(delString)}).catch(() => false);
		}
	}

	return await processTransaction(contextEndpoint, {"add": contextLD, "delete": contextLD, "source": source}) &&
		await processTransaction(contextEndpoint, {"add": ogContextLD, "delete": ogContextLD, "source": source});
}

export async function resetData(contextEndpoint: string) {
	for (let iri in VocabularyElements) {
		for (const restr of VocabularyElements[iri].restrictions) {
			let i = VocabularyElements[iri].restrictions.indexOf(restr);
			let delString = await processGetTransaction(contextEndpoint, {subject: iri + "/restriction-" + (i + 1)}).catch(() => false);
			if (typeof delString === "string") {
				await processTransaction(contextEndpoint, {"delete": JSON.parse(delString)}).catch(() => false);
			} else return false;
		}
	}
}