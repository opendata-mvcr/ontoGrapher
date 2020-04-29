import * as Helper from "../function/FunctionEditVars";
import {initLanguageObject} from "../function/FunctionEditVars";
import {Links, PropertyPool, Schemes, Stereotypes} from "../config/Variables";
import {AttributeType} from "../datatypes/AttributeType";

export async function fetchConcepts(
    endpoint: string,
    source: string,
    readOnly: boolean,
    callback?: Function,
    requiredTypes?: string[],
    requiredValues?: string[]) {
    if (!(source in Schemes)) await getScheme(source, endpoint, readOnly, callback);

    let result: {
        [key: string]: {
            labels: { [key: string]: string },
            definitions: { [key: string]: string },
            types: string[],
            inScheme: string
        }
    } = {};


    let query = [
        "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>",
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
        "SELECT DISTINCT ?term ?termLabel ?termType ?termDefinition",
        "WHERE {",
        "?term skos:inScheme <" + source + ">.",
        "?term a ?termType.",
        requiredTypes ?
            "VALUES ?termType {<" + requiredTypes.join("> <") + ">}"
            : "",
        requiredValues ?
            "VALUES ?term {<" + requiredValues.join("> <") + ">}"
            : "",
        "OPTIONAL {?term skos:prefLabel ?termLabel.}",
        "OPTIONAL {?term skos:definition ?termLabel.}",
        "}"
    ].join(" ");
    let q = endpoint + "?query=" + encodeURIComponent(query) + "&format=json";
}

export async function getLinks(name: string, jsonData: { [key: string]: any }, callback: Function) {
    if (!(jsonData.sourceIRI in Schemes)) await getScheme(jsonData.sourceIRI, jsonData.endpoint, false, function () {
    });

    let result: {} = {};

    let query = [
        "SELECT DISTINCT ?term ?termLabel ?termType ?termDefinition ?skosLabel ?skosDefinition",
        "WHERE {",
        "?term <" + jsonData.propertyIRI + "> <" + jsonData.sourceIRI + ">.",
        "?term <" + jsonData.labelIRI + "> ?termLabel.",
        "?term a ?termType.",
        "?term skos:prefLabel ?skosLabel.",
        "?term skos:definition ?skosDefinition.",
        "FILTER (?termType IN (<" + jsonData.relationshipIRI.join(">,<") + ">)).",
        "OPTIONAL {?term <" + jsonData.definitionIRI + "> ?termDefinition.}",
        "}"
    ].join(" ");
    let q = jsonData.endpoint + "?query=" + encodeURIComponent(query) + "&format=json";
    await fetch(q)
        .then(response => {
            return response.json();
        })
        .then(async data => {
            for (let row of data.results.bindings) {
                let subclasses: {} = await getSubclasses(row.term.value, jsonData, "http://www.w3.org/2000/01/rdf-schema#subPropertyOf", name, callback);

                // if (jsonData.relationshipIRI.indexOf(result.termType.value) > -1) {
                //     if (result.term.value in Links) {
                //         if (result.termLabel !== undefined) Links[result.term.value].labels[result.termLabel['xml:lang']] = result.termLabel.value;
                //         if (result.termDefinition !== undefined) Links[result.term.value].definitions[result.termLabel['xml:lang']] = result.termDefinition.value;
                //         if (result.skosLabel !== undefined) Links[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                //         if (result.skosDefinition !== undefined) Links[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                //     } else {
                //         Links[result.term.value] = {
                //             labels: initLanguageObject(result.termLabel.value),
                //             definitions: initLanguageObject(result.termDefinition === undefined ? "" : result.termDefinition.value),
                //             category: name,
                //             skos: {}
                //         };
                //         Links[result.term.value].skos.prefLabel = {};
                //         Links[result.term.value].skos.definition = {};
                //         Links[result.term.value].skos.inScheme = jsonData.sourceIRI;
                //         if (result.skosLabel !== undefined) Links[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                //         if (result.skosDefinition !== undefined) Links[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                //     }
                // }

            }
            for (let attribute of jsonData["attributes"]) {
                if (!(name in PropertyPool)) {
                    PropertyPool[name] = [];
                }
                let isArray = Array.isArray(attribute["type"]);
                let atrt = new AttributeType(attribute["name"], attribute["iri"], isArray ? attribute["type"][0] : attribute["type"], isArray);
                PropertyPool[name].push(atrt);
            }
            callback(true);
        })
        .catch(err => {
            console.log(err);
            callback(false);
        })
}

export async function getStereotypes(name: string, jsonData: { [key: string]: any }, callback: Function) {
    if (!(jsonData.sourceIRI in Schemes)) {
        await getScheme(jsonData.sourceIRI, jsonData.endpoint, false, function () {
        });
    }
    let values: string[] = [];
    let result: {} = {};
    for (let prefix of Object.keys(jsonData.values)) {
        for (let value of jsonData.values[prefix]) {
            values.push(jsonData.prefixes[prefix] + value);
        }
    }
    let query = [
        "SELECT DISTINCT ?term ?termType ?skosLabel ?skosDefinition",
        "WHERE {",
        "?term <" + jsonData.propertyIRI + "> <" + jsonData.sourceIRI + ">.",
        "?term a ?termType.",
        "OPTIONAL {?term skos:prefLabel ?skosLabel.}",
        "OPTIONAL {?term skos:definition ?skosDefinition.}",
        "}"
    ].join(" ");
    let q = jsonData.endpoint + "?query=" + encodeURIComponent(query) + "&format=json";
    await fetch(q)
        .then(response => {
            return response.json();
        })
        .then(data => {
            for (let result of data.results.bindings) {
                if (jsonData.values) {
                    if (!(values.includes(result.term.value))) continue;
                }
                getSubclasses(result.term.value, jsonData, "http://www.w3.org/2000/01/rdf-schema#subPropertyOf", name, callback);
                if (result.term.value in Stereotypes) {
                    if (result.termLabel !== undefined) Stereotypes[result.term.value].labels[result.termLabel['xml:lang']] = result.termLabel.value;
                    if (result.termDefinition !== undefined) Stereotypes[result.term.value].definitions[result.termLabel['xml:lang']] = result.termDefinition.value;
                    if (result.skosLabel !== undefined) Stereotypes[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                    if (result.skosDefinition !== undefined) Stereotypes[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                } else {
                    Helper.addSTP(new SourceData(result.termLabel.value, result.term.value, result.termDefinition === undefined ? "" : result.termDefinition.value, name));
                    Stereotypes[result.term.value].skos.prefLabel = {};
                    Stereotypes[result.term.value].skos.definition = {};
                    Stereotypes[result.term.value].skos.inScheme = jsonData.sourceIRI;
                    if (result.skosLabel !== undefined) Stereotypes[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                    if (result.skosDefinition !== undefined) Stereotypes[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                }
            }
            for (let attribute of jsonData["attributes"]) {
                if (!(name in PropertyPool)) {
                    PropertyPool[name] = [];
                }
                let isArray = Array.isArray(attribute["type"]);
                let atrt = new AttributeType(attribute["name"], attribute["iri"], isArray ? attribute["type"][0] : attribute["type"], isArray);
                PropertyPool[name].push(atrt);
            }
            if (!(StereotypeCategories.includes(name))) {
                StereotypeCategories.push(name);
            }
            callback(true);
            return result;
        })
        .catch(err => {
            console.log(err);
            callback(false);
        })
}

export async function getSubclasses(superIRI: string, jsonData: { [key: string]: any }, subclassIRI: string, name: string, callback: Function) {
    let query = [
        "SELECT DISTINCT ?term ?termLabel ?termType ?termDefinition ?scheme",
        "WHERE {",
        "?term <" + subclassIRI + "> <" + superIRI + ">.",
        "?term a ?termType.",
        "FILTER (?termType IN (<" + jsonData.classIRI.join(">,<") + ">,<" + jsonData.relationshipIRI.join(">,<") + ">)).",
        "OPTIONAL {?term <" + jsonData.propertyIRI + "> ?scheme.}",
        "OPTIONAL {?term <" + jsonData.labelIRI + "> ?termLabel.}",
        "OPTIONAL {?term <" + jsonData.definitionIRI + "> ?termDefinition.}",
        "}"
    ].join(" ");
    let q = jsonData.endpoint + "?query=" + encodeURIComponent(query) + "&format=json";
    await fetch(q)
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.results.bindings.length === 0) return;
            for (let result of data.results.bindings) {
                if (result.scheme !== undefined) {
                    if (result.scheme.value !== jsonData.sourceIRI) continue;
                }
                if (jsonData.classIRI.indexOf(result.termType.value) > -1) {
                    if (result.term.value in Stereotypes) {
                        if (result.termLabel !== undefined) Stereotypes[result.term.value].labels[result.termLabel['xml:lang']] = result.termLabel.value;
                        if (result.termDefinition !== undefined) Stereotypes[result.term.value].definitions[result.termLabel['xml:lang']] = result.termDefinition.value;
                        if (result.skosLabel !== undefined) Stereotypes[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                        if (result.skosDefinition !== undefined) Stereotypes[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                    } else {
                        Stereotypes[result.term.value].skos.prefLabel = {};
                        Stereotypes[result.term.value].skos.definition = {};
                        Stereotypes[result.term.value].skos.inScheme = jsonData.sourceIRI;
                        if (result.skosLabel !== undefined) Stereotypes[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                        if (result.skosDefinition !== undefined) Stereotypes[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                    }
                } else if (jsonData.relationshipIRI.indexOf(result.termType.value) > -1) {
                    if (result.term.value in Links) {
                        if (result.termLabel !== undefined) Links[result.term.value].labels[result.termLabel['xml:lang']] = result.termLabel.value;
                        if (result.termDefinition !== undefined) Links[result.term.value].definitions[result.termLabel['xml:lang']] = result.termDefinition.value;
                        if (result.skosLabel !== undefined) Links[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                        if (result.skosDefinition !== undefined) Links[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                    } else {
                        let namelabels = result.termLabel === undefined ? result.term.value.substring(result.term.value.lastIndexOf("/") + 1) : result.termLabel.value;
                        Links[result.term.value] = {
                            labels: initLanguageObject(namelabels),
                            definitions: initLanguageObject(result.termDefinition === undefined ? "" : result.termDefinition.value),
                            category: name,
                            skos: {}
                        };
                        Links[result.term.value].skos.prefLabel = {};
                        Links[result.term.value].skos.definition = {};
                        Links[result.term.value].skos.inScheme = jsonData.sourceIRI;
                        if (result.skosLabel !== undefined) Links[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                        if (result.skosDefinition !== undefined) Links[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                    }
                }
            }
            callback(true);
        })
        .catch(err => {
            callback(false);
            console.log(err);
        })
}

export async function getVocabularyElements(name: string, jsonData: { [key: string]: any }, callback: Function) {
    if (!(jsonData.sourceIRI in Schemes)) {
        await getScheme(jsonData.sourceIRI, jsonData.endpoint, function () {
        });
    }
    let query = [
        "SELECT DISTINCT ?term ?termLabel ?termType ?termDefinition ?skosLabel ?skosDefinition",
        "WHERE {",
        "?term <" + jsonData.propertyIRI + "> <" + jsonData.sourceIRI + ">.",
        "?term <" + jsonData.labelIRI + "> ?termLabel.",
        "?term a ?termType.",
        "?term skos:prefLabel ?skosLabel.",
        "?term skos:definition ?skosDefinition.",
        "OPTIONAL {?term <" + jsonData.definitionIRI + "> ?termDefinition. }",
        "OPTIONAL {?term rdfs:range ?range.}",
        "OPTIONAL {?term rdfs:domain ?domain.}",
        "}"
    ].join(" ");
    let q = jsonData.endpoint + "?query=" + encodeURIComponent(query) + "&format=json";
    await fetch(q)
        .then(response => {
            return response.json();
        })
        .then(data => {
            for (let result of data.results.bindings) {

                // if (result.term.value in ModelElements) {
                //     if (result.termLabel !== undefined) ModelElements[result.term.value].labels[result.termLabel['xml:lang']] = result.termLabel.value;
                //     if (result.termDefinition !== undefined) ModelElements[result.term.value].definitions[result.termDefinition['xml:lang']] = result.termDefinition.value;
                //     if (result.skosLabel !== undefined) ModelElements[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                //     if (result.skosDefinition !== undefined) ModelElements[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                //     if (result.termType !== undefined && result.termType.value in Stereotypes && !(ModelElements[result.term.value].iri.includes(result.termType.value))) {
                //         ModelElements[result.term.value].iri.push(result.termType.value);
                //     }
                //     if (result.domain !== undefined) ModelElements[result.term.value].terms[result.term.value].domain = result.domain.value;
                //     if (result.range !== undefined) ModelElements[result.term.value].terms[result.term.value].range = result.range.value;
                // } else {
                //     Helper.addModelTP(new SourceData(result.termLabel.value, result.term.value, result.termDefinition === undefined ? "" : result.termDefinition.value, jsonData.sourceIRI));
                //     ModelElements[result.term.value].iri = [];
                //     ModelElements[result.term.value].skos.prefLabel = {};
                //     ModelElements[result.term.value].skos.definition = {};
                //     ModelElements[result.term.value].skos.inScheme = jsonData.sourceIRI;
                //     ModelElements[result.term.value].domainOf = [];
                //     if (result.skosLabel !== undefined) ModelElements[result.term.value].skos.prefLabel[result.skosLabel['xml:lang']] = result.skosLabel.value;
                //     if (result.skosDefinition !== undefined) ModelElements[result.term.value].skos.definition[result.skosDefinition['xml:lang']] = result.skosDefinition.value;
                //     if (result.termType !== undefined && result.termType.value in Stereotypes && !(ModelElements[result.term.value].iri.includes(result.termType.value))) {
                //         ModelElements[result.term.value].iri.push(result.termType.value);
                //     }
                //     if (result.domain !== undefined) ModelElements[result.term.value].terms[result.term.value].domain = result.domain.value;
                //     if (result.range !== undefined) ModelElements[result.term.value].terms[result.term.value].range = result.range.value;
                // }

            }
            callback(true);
        })
        .catch(err => {
            callback(false);
            console.log(err);
        })
}

export async function getScheme(iri: string, endpoint: string, readOnly: boolean, callback?: Function) {
    let query = [
        "SELECT DISTINCT ?term ?termLabel ",
        "WHERE {",
        "<" + iri + "> rdfs:label ?termLabel",
        "}"
    ].join(" ");
    let q = endpoint + "?query=" + encodeURIComponent(query);
    await fetch(q, {headers: {'Accept': 'application/json'}}).then(response => {
        return response.json();
    }).then(data => {
        for (let result of data.results.bindings) {
            if (!(iri in Schemes)) Schemes[iri] = {labels: {}, readOnly: readOnly}
            if (result.termLabel !== undefined) Schemes[iri].labels[result.termLabel['xml:lang']] = result.termLabel.value;
        }
        if (callback) callback(true);
    }).catch(e => {
        if (callback) callback(false);
        console.log(e);
    })
}