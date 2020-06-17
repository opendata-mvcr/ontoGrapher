import {Diagrams, ProjectElements, ProjectLinks, ProjectSettings, Schemes} from "../config/Variables";
import {initLanguageObject} from "../function/FunctionEditVars";
import {AttributeObject} from "../datatypes/AttributeObject";
import * as joint from "jointjs";
import {Cardinality} from "../datatypes/Cardinality";

import * as Locale from "../locale/LocaleMain.json";
import {createRestriction} from "../function/FunctionRestriction";

export async function fetchConcepts(
    endpoint: string,
    source: string,
    sendTo: { [key: string]: any },
    readOnly: boolean,
    graph?: string,
    callback?: Function,
    getSubProperties?: boolean,
    subPropertyOf?: string,
    requiredTypes?: string[],
    requiredValues?: string[]) {
    if (!(source in Schemes)) await getScheme(source, endpoint, readOnly, callback);

    let result: {
        [key: string]: {
            labels: { [key: string]: string },
            definitions: { [key: string]: string },
            types: string[],
            inScheme: string,
            domainOf: []
            domain?: string,
            range?: string,
            restrictions: [],
            type: string,
        }
    } = {};

    let query = [
        "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>",
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
        "SELECT DISTINCT ?term ?termLabel ?termType ?termDefinition ?termDomain ?termRange ?restriction",
        "WHERE {",
        graph ? "GRAPH <" + graph + "> {" : "",
        !subPropertyOf ? "?term skos:inScheme <" + source + ">." : "",
        "?term a ?termType.",
        subPropertyOf ? "?term rdfs:subPropertyOf <" + subPropertyOf + ">." : "",
        requiredTypes ? "VALUES ?termType {<" + requiredTypes.join("> <") + ">}" : "",
        requiredValues ? "VALUES ?term {<" + requiredValues.join("> <") + ">}" : "",
        "OPTIONAL {?term skos:prefLabel ?termLabel.}",
        "OPTIONAL {?term skos:definition ?termDefinition.}",
        "OPTIONAL {?term rdfs:domain ?termDomain.}",
        "OPTIONAL {?term rdfs:range ?termRange.}",
        "OPTIONAL {?term rdfs:subClassOf ?restriction. ",
        "?restriction a owl:Restriction .}",
        "}",
        graph ? "}" : "",
    ].join(" ");
    let q = endpoint + "?query=" + encodeURIComponent(query);
    await fetch(q, {headers: {"Accept": "application/json"}}).then(
        response => response.json()
    ).then(data => {
        for (let row of data.results.bindings) {
            if (!(row.term.value in result)) {
                if (getSubProperties) fetchConcepts(endpoint, source, sendTo, readOnly, graph, callback, getSubProperties, row.term.value, requiredTypes, requiredValues);
                result[row.term.value] = {
                    labels: initLanguageObject(""),
                    definitions: initLanguageObject(""),
                    types: [],
                    inScheme: source,
                    domainOf: [],
                    restrictions: [],
                    type: "default"
                }
            }
            if (row.termType && !(result[row.term.value].types.includes(row.termType.value))) result[row.term.value].types.push(row.termType.value);
            if (row.termLabel) result[row.term.value].labels[row.termLabel['xml:lang']] = row.termLabel.value;
            if (row.termDefinition) result[row.term.value].definitions[row.termDefinition['xml:lang']] = row.termDefinition.value;
            if (row.termDomain) result[row.term.value].domain = row.termDomain.value;
            if (row.termRange) result[row.term.value].range = row.termRange.value;
            if (row.restriction && row.restriction.type !== "bnode") getRestriction(endpoint, row.term.value, row.restriction.value);
        }
        Object.assign(sendTo, result);
        if (callback) callback(true);
    }).catch(() => {
        if (callback) callback(false);
    });
}

export async function getRestriction(endpoint: string, iri: string, restriction: string, callback?: Function) {
    let query = [
        "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
        "select ?onProperty ?restriction ?target where {",
        "<" + restriction + "> a owl:Restriction.",
        "<" + restriction + "> owl:onProperty ?onProperty.",
        "<" + restriction + "> ?restriction ?target.",
        "filter (?restriction not in (owl:onProperty, rdf:type))",
        "}",
    ].join(" ");
    let q = endpoint + "?query=" + encodeURIComponent(query);
    await fetch(q, {headers: {"Accept": "application/json"}}).then(
        response => response.json()
    ).then(async data => {
        for (let row of data.results.bindings) {
            createRestriction(iri, row.restriction.value, row.onProperty.value, row.target);
        }
        if (callback) callback(true);
    }).catch(() => {
        if (callback) callback(false);
    });

}

export async function getScheme(iri: string, endpoint: string, readOnly: boolean, callback?: Function) {
    let query = [
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
        "PREFIX dct: <http://purl.org/dc/terms/>",
        "SELECT DISTINCT ?termLabel ?termTitle ?graph",
        "WHERE {",
        "GRAPH ?graph {",
        "OPTIONAL { <" + iri + "> dct:title ?termTitle . }",
        "OPTIONAL { <" + iri + "> rdfs:label ?termLabel . }",
        "}",
        "}"
    ].join(" ");
    let q = endpoint + "?query=" + encodeURIComponent(query);
    await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
        return response.json();
    }).then(data => {
        for (let result of data.results.bindings) {
            if (!(iri in Schemes)) Schemes[iri] = {labels: {}, readOnly: readOnly, graph: ""}
            if (result.termLabel) Schemes[iri].labels[result.termLabel['xml:lang']] = result.termLabel.value;
            if (result.termTitle) Schemes[iri].labels[result.termTitle['xml:lang']] = result.termTitle.value;
            if (result.graph) Schemes[iri].graph = result.graph.value;
        }
    }).catch(() => {
        if (callback) callback(false);
    });
}

export async function getElementsConfig(contextIRI: string, contextEndpoint: string, callback?: Function): Promise<boolean> {
    let elements: {
        [key: string]: {
            id: "",
            untitled: boolean,
            attributeIRI: string[],
            propertyIRI: string[],
            diagramIRI: number[],
            active: boolean,
            diagramPosition: { [key: number]: { x: number, y: number } },
            hidden: { [key: number]: boolean },
            attributes: AttributeObject[],
            properties: AttributeObject[],
            diagrams: number[]
        }
    } = {}
    let query = [
        "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
        "select ?id ?iri ?untitled ?active ?attribute ?property ?diagram where {",
        "?elem a og:element .",
        "?elem og:context <" + contextIRI + ">.",
        "?elem og:iri ?iri .",
        "?elem og:id ?id .",
        "?elem og:active ?active .",
        "?elem og:untitled ?untitled .",
        "OPTIONAL {?elem og:attribute ?attribute . }",
        "OPTIONAL {?elem og:property ?property . }",
        "?elem og:diagram ?diagram .",
        "}"
    ].join(" ");
    let q = contextEndpoint + "?query=" + encodeURIComponent(query);
    await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
        return response.json();
    }).then(data => {
        for (let result of data.results.bindings) {
            let iri = result.iri.value;
            if (!(iri in elements)) {
                elements[iri] = {
                    id: "",
                    untitled: false,
                    attributeIRI: [],
                    propertyIRI: [],
                    diagramIRI: [],
                    diagrams: [],
                    active: true,
                    diagramPosition: {},
                    hidden: {},
                    attributes: [],
                    properties: [],
                }
            }
            elements[iri].id = result.id.value;
            elements[iri].active = result.active.value === "true";
            elements[iri].untitled = result.untitled.value === "true";
            elements[iri].diagramIRI.push(result.diagram.value);
            if (result.attribute) elements[iri].attributeIRI.push(result.attribute.value);
            if (result.property) elements[iri].propertyIRI.push(result.property.value);
        }
    }).catch(() => {
        if (callback) callback(false);
    });
    for (let iri in elements) {
        if (elements[iri].diagramIRI.length > 0) {
            for (let diag of elements[iri].diagramIRI) {
                let query = [
                    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
                    "select ?positionX ?positionY ?hidden ?index where {",
                    "BIND(<" + diag + "> as ?iri) .",
                    "?iri og:position-y ?positionY .",
                    "?iri og:position-x ?positionX .",
                    "?iri og:index ?index .",
                    "?iri og:hidden ?hidden .",
                    "}"
                ].join(" ");
                let q = contextEndpoint + "?query=" + encodeURIComponent(query);
                await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
                    return response.json();
                }).then(data => {
                    for (let result of data.results.bindings) {
                        if (result.index) {
                            let index = parseInt(result.index.value);
                            elements[iri].diagrams.push(index);
                            elements[iri].diagramPosition[index] = {
                                x: parseInt(result.positionX.value),
                                y: parseInt(result.positionY.value)
                            };
                            elements[iri].hidden[index] = result.hidden.value === "true";
                        }
                    }
                }).catch(() => {
                    if (callback) callback(false);
                });
            }
        }
        if (elements[iri].attributeIRI.length > 0) {
            for (let attr of elements[iri].attributeIRI) {
                let query = [
                    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
                    "select ?attrname ?attrtype where {",
                    "BIND(<" + attr + "> as ?iri) .",
                    "?iri og:attribute-name ?attrname .",
                    "?iri og:attribute-type ?attrtype .",
                    "}"
                ].join(" ");
                let q = contextEndpoint + "?query=" + encodeURIComponent(query);
                await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
                    return response.json();
                }).then(data => {
                    for (let result of data.results.bindings) {
                        if (result.attrname && result.attrtype) {
                            elements[iri].attributes.push(new AttributeObject(result.attrname.value, result.attrtype.value));
                        }
                    }
                }).catch(() => {
                    if (callback) callback(false);
                });
            }
        }
        if (elements[iri].propertyIRI.length > 0) {
            for (let attr of elements[iri].propertyIRI) {
                let query = [
                    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
                    "select ?attrname ?attrtype where {",
                    "BIND(<" + attr + "> as ?iri) .",
                    "?iri og:attribute-name ?attrname .",
                    "?iri og:attribute-type ?attrtype .",
                    "}"
                ].join(" ");
                let q = contextEndpoint + "?query=" + encodeURIComponent(query);
                await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
                    return response.json();
                }).then(data => {
                    for (let result of data.results.bindings) {
                        if (result.attrname && result.attrtype) {
                            elements[iri].properties.push(new AttributeObject(result.attrname.value, result.attrtype.value));
                        }
                    }
                }).catch(() => {
                    if (callback) callback(false);
                });
            }
        }
    }
    for (let id in ProjectElements) {
        if (ProjectElements[id].iri in elements) {
            ProjectElements[id].untitled = elements[ProjectElements[id].iri].untitled;
            ProjectElements[id].properties = elements[ProjectElements[id].iri].properties;
            ProjectElements[id].attributes = elements[ProjectElements[id].iri].attributes;
            ProjectElements[id].hidden = elements[ProjectElements[id].iri].hidden;
            ProjectElements[id].diagrams = elements[ProjectElements[id].iri].diagrams;
            ProjectElements[id].active = elements[ProjectElements[id].iri].active;
            ProjectElements[id].position = elements[ProjectElements[id].iri].diagramPosition;
        }
    }
    if (callback) callback(true);
    return true;
}

export async function getSettings(contextIRI: string, contextEndpoint: string, callback?: Function): Promise<boolean> {
    let query = [
        "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
        "select ?diagram ?index ?name where {",
        "?diagram og:context <" + contextIRI + "> .",
        "?diagram og:index ?index .",
        "?diagram og:name ?name .",
        "}"
    ].join(" ");
    let q = contextEndpoint + "?query=" + encodeURIComponent(query);
    await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
        return response.json();
    }).then(data => {
        for (let result of data.results.bindings) {
            if (!(parseInt(result.index.value) in Diagrams)) {
                Diagrams[parseInt(result.index.value)] = {name: Locale.untitled, json: {}}
            }
            Diagrams[parseInt(result.index.value)].name = result.name.value;
        }
        if (data.results.bindings.length > 0) ProjectSettings.initialized = true;
    }).catch(() => {
        if (callback) callback(false);
        return false;
    });
    return true;
}

export async function getLinksConfig(contextIRI: string, contextEndpoint: string, callback?: Function): Promise<boolean> {
    let query = [
        "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
        "select ?id ?iri ?sourceID ?targetID ?source ?target ?sourceCard1 ?sourceCard2 ?targetCard1 ?targetCard2 ?diagram ?vertex ?type where {",
        "?link a og:link .",
        "?link og:id ?id .",
        "?link og:iri ?iri .",
        "?ling og:context <" + contextIRI + ">.",
        "?link og:source-id ?sourceID .",
        "?link og:target-id ?targetID .",
        "?link og:source ?source .",
        "?link og:target ?target .",
        "?link og:diagram ?diagram .",
        "?link og:type ?type",
        "OPTIONAL {?link og:vertex ?vertex .}",
        "OPTIONAL {?link og:sourceCardinality1 ?sourceCard1 .}",
        "OPTIONAL {?link og:sourceCardinality2 ?sourceCard2 .}",
        "OPTIONAL {?link og:targetCardinality1 ?targetCard1 .}",
        "OPTIONAL {?link og:targetCardinality2 ?targetCard2 .}",
        "}"
    ].join(" ");
    let q = contextEndpoint + "?query=" + encodeURIComponent(query);
    let links: {
        [key: string]: {
            iri: string,
            source: string,
            target: string,
            targetID: string,
            sourceID: string,
            diagram: number,
            vertexIRI: string[]
            vertexes: { [key: number]: any },
            sourceCardinality1?: string,
            sourceCardinality2?: string,
            targetCardinality1?: string,
            targetCardinality2?: string,
            type: string,
        }
    } = {};
    await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
        return response.json();
    }).then(data => {
        for (let result of data.results.bindings) {
            if (!(result.id.value in links)) {
                links[result.id.value] = {
                    iri: result.iri.value,
                    source: result.source.value,
                    target: result.target.value,
                    targetID: result.targetID.value,
                    sourceID: result.sourceID.value,
                    diagram: parseInt(result.diagram.value),
                    vertexIRI: [],
                    vertexes: {},
                    type: result.type.value
                }
            }
            if (result.vertex) links[result.id.value].vertexIRI.push(result.vertex.value);
            if (result.sourceCard1) links[result.id.value].sourceCardinality1 = result.sourceCard1.value;
            if (result.sourceCard2) links[result.id.value].sourceCardinality2 = result.sourceCard2.value;
            if (result.targetCard1) links[result.id.value].targetCardinality1 = result.targetCard1.value;
            if (result.targetCard2) links[result.id.value].targetCardinality2 = result.targetCard2.value;
        }
    }).catch(() => {
        if (callback) callback(false);
    });

    for (let link in links) {
        if (links[link].vertexIRI.length > 0) {
            links[link].vertexes = {};
            for (let vertexIRI in links[link].vertexIRI) {
                let query = [
                    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
                    "select ?posX ?posY ?index where {",
                    "BIND(<" + vertexIRI + "> as ?iri) .",
                    "?iri og:index ?index .",
                    "?iri og:position-x ?posX .",
                    "?iri og:position-y ?posY .",
                    "}"
                ].join(" ");
                let q = contextEndpoint + "?query=" + encodeURIComponent(query);
                await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
                    return response.json();
                }).then(data => {
                    for (let result of data.results.bindings) {
                        links[link].vertexes[parseInt(result.index.value)] = {
                            x: parseInt(result.posX.value),
                            y: parseInt(result.posY.value)
                        };
                    }
                }).catch(() => {
                    if (callback) callback(false);
                });
            }
        }
        let sourceID, targetID;
        for (let id in ProjectElements) {
            if (ProjectElements[id].iri === links[link].source) sourceID = id;
            if (ProjectElements[id].iri === links[link].target) targetID = id;
            if (targetID && sourceID) break;
        }

        let convert: joint.dia.Link.Vertex[] = [];

        Object.keys(links[link].vertexes).forEach((vertex, i) => convert.push(links[link].vertexes[i]))

        if (targetID && sourceID) {
            let sourceCard = new Cardinality(Locale.none, Locale.none);
            let targetCard = new Cardinality(Locale.none, Locale.none);
            if (links[link].sourceCardinality1 && links[link].sourceCardinality2) {
                // @ts-ignore
                sourceCard.setFirstCardinality(links[link].sourceCardinality1 ? links[link].sourceCardinality1 : Locale.none)
                // @ts-ignore
                sourceCard.setSecondCardinality(links[link].sourceCardinality2 ? links[link].sourceCardinality2 : Locale.none)
            }
            if (links[link].targetCardinality1 && links[link].targetCardinality2) {
                // @ts-ignore
                targetCard.setFirstCardinality(links[link].targetCardinality1 ? links[link].targetCardinality1 : Locale.none)
                // @ts-ignore
                targetCard.setSecondCardinality(links[link].targetCardinality2 ? links[link].targetCardinality2 : Locale.none)
            }
            ProjectLinks[link] = {
                iri: links[link].iri,
                source: sourceID,
                target: targetID,
                sourceCardinality: sourceCard,
                targetCardinality: targetCard,
                vertices: convert,
                diagram: links[link].diagram,
                type: links[link].type
            }
            if (sourceID) {
                if (!ProjectElements[sourceID].connections.includes(link)) {
                    ProjectElements[sourceID].connections.push(link);
                }
            }
        }
    }

    if (callback) callback(true);
    return true;
}