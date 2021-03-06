import { processQuery } from "../../../interface/TransactionInterface";
import { initLanguageObject } from "../../../function/FunctionEditVars";
import {
  AppSettings,
  Diagrams,
  PackageRoot,
  WorkspaceElements,
  WorkspaceLinks,
  WorkspaceTerms,
} from "../../../config/Variables";
import { Cardinality } from "../../../datatypes/Cardinality";
import { LinkType } from "../../../config/Enum";
import { Locale } from "../../../config/Locale";
import { fetchConcepts } from "../../get/FetchQueries";
import { qb } from "../../QueryBuilder";
import { getWorkspaceContextIRI } from "../../../function/FunctionGetVars";
import { LinkConfig } from "../../../config/logic/LinkConfig";
import { addDiagram } from "../../../function/FunctionCreateVars";

export async function updateLegacyWorkspaceToVersion2(
  contextIRI: string,
  contextEndpoint: string
): Promise<string[]> {
  const triples: string[] = [];
  const diagrams = await getLegacyDiagrams(contextIRI, contextEndpoint);
  const elements = await getLegacyElements(contextIRI, contextEndpoint);
  const links = await getLegacyConnections(
    contextIRI,
    contextEndpoint,
    elements
  );
  const terms = await getLegacyTerms(contextIRI, contextEndpoint);
  triples.push(
    qb.g(
      getWorkspaceContextIRI(),
      diagrams.map((diagram, i) =>
        [
          qb.s(
            qb.i(getWorkspaceContextIRI()),
            "og:diagram",
            qb.i(getWorkspaceContextIRI() + "/diagram-" + (i + 1))
          ),
          qb.s(
            qb.i(getWorkspaceContextIRI() + "/diagram-" + (i + 1)),
            "og:index",
            qb.ll(i)
          ),
          qb.s(
            qb.i(getWorkspaceContextIRI() + "/diagram-" + (i + 1)),
            "og:name",
            qb.ll(diagram.name)
          ),
          qb.s(
            qb.i(getWorkspaceContextIRI() + "/diagram-" + (i + 1)),
            "og:active",
            qb.ll(diagram.active)
          ),
        ].join(`
  `)
      )
    )
  );
  triples.push(
    qb.g(
      getWorkspaceContextIRI(),
      Object.keys(elements).map((element) =>
        [
          qb.s(qb.i(elements[element].iri), "rdf:type", "og:element"),
          qb.s(qb.i(elements[element].iri), "og:id", qb.ll(element)),
          qb.s(
            qb.i(elements[element].iri),
            "og:iri",
            qb.i(elements[element].iri)
          ),
          qb.s(
            qb.i(elements[element].iri),
            "og:scheme",
            qb.i(terms[elements[element].iri].inScheme)
          ),
          qb.s(
            qb.i(elements[element].iri),
            "og:name",
            qb.a(
              Object.keys(elements[element].selectedLabel).map((lang) =>
                qb.ll(elements[element].selectedLabel[lang], lang)
              )
            )
          ),
          qb.s(
            qb.i(elements[element].iri),
            "og:diagram",
            qb.a(
              elements[element].diagrams.map((diag) =>
                qb.i(`${elements[element].iri}/diagram-${diag + 1}`)
              )
            ),
            diagrams.length > 0
          ),
          qb.s(
            qb.i(elements[element].iri),
            "og:active",
            qb.ll(elements[element].active)
          ),
        ].join(`
  `)
      )
    )
  );
  Object.keys(elements).forEach((element) =>
    elements[element].diagrams.forEach((diagram) => {
      triples.push(
        qb.g(getWorkspaceContextIRI(), [
          qb.s(
            qb.i(`${elements[element].iri}`),
            "og:diagram",
            qb.i(`${elements[element].iri}/diagram-${diagram + 1}`)
          ),
          qb.s(
            qb.i(`${elements[element].iri}/diagram-${diagram + 1}`),
            "rdf:type",
            "og:elementDiagram"
          ),
          qb.s(
            qb.i(`${elements[element].iri}/diagram-${diagram + 1}`),
            "og:index",
            qb.ll(diagram)
          ),
          qb.s(
            qb.i(`${elements[element].iri}/diagram-${diagram + 1}`),
            "og:position-x",
            qb.ll(Math.round(elements[element].position[diagram].x))
          ),
          qb.s(
            qb.i(`${elements[element].iri}/diagram-${diagram + 1}`),
            "og:position-y",
            qb.ll(Math.round(elements[element].position[diagram].y))
          ),
          qb.s(
            qb.i(`${elements[element].iri}/diagram-${diagram + 1}`),
            "og:hidden",
            qb.ll(elements[element].hidden[diagram])
          ),
        ])
      );
    })
  );
  triples.push(
    qb.g(
      getWorkspaceContextIRI(),
      Object.keys(links).map((link) =>
        [
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "rdf:type",
            "og:link"
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:id",
            qb.ll(link)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:iri",
            qb.i(links[link].iri)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:active",
            qb.ll(links[link].active)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:source-id",
            qb.ll(links[link].source)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:target-id",
            qb.ll(links[link].target)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:source",
            qb.i(elements[links[link].source].iri)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:target",
            qb.i(elements[links[link].target].iri)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:type",
            qb.ll(LinkConfig[links[link].type].id)
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:sourceCardinality1",
            qb.ll(links[link].sourceCardinality.getFirstCardinality())
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:sourceCardinality2",
            qb.ll(links[link].sourceCardinality.getSecondCardinality())
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:targetCardinality1",
            qb.ll(links[link].targetCardinality.getFirstCardinality())
          ),
          qb.s(
            qb.i(AppSettings.ontographerContext + "-" + link),
            "og:targetCardinality2",
            qb.ll(links[link].targetCardinality.getSecondCardinality())
          ),
        ].join(`
  `)
      )
    )
  );
  Object.keys(links).forEach((link) =>
    Object.keys(links[link].vertices).forEach((diagram, i) =>
      links[link].vertices[parseInt(diagram)].forEach((vertex, j) => {
        triples.push(
          qb.g(getWorkspaceContextIRI(), [
            qb.s(
              qb.i(AppSettings.ontographerContext + "-" + link),
              "og:vertex",
              qb.i(
                `${AppSettings.ontographerContext + "-" + link}/diagram-${
                  i + 1
                }/vertex-${j + 1}`
              )
            ),
            qb.s(
              qb.i(
                `${AppSettings.ontographerContext + "-" + link}/diagram-${
                  i + 1
                }/vertex-${j + 1}`
              ),
              "rdf:type",
              "og:vertexDiagram"
            ),
            qb.s(
              qb.i(
                `${AppSettings.ontographerContext + "-" + link}/diagram-${
                  i + 1
                }/vertex-${j + 1}`
              ),
              "og:index",
              qb.ll(j)
            ),
            qb.s(
              qb.i(
                `${AppSettings.ontographerContext + "-" + link}/diagram-${
                  i + 1
                }/vertex-${j + 1}`
              ),
              "og:diagram",
              qb.ll(diagram)
            ),
            qb.s(
              qb.i(
                `${AppSettings.ontographerContext + "-" + link}/diagram-${
                  i + 1
                }/vertex-${j + 1}`
              ),
              "og:position-x",
              qb.ll(Math.round(vertex.x))
            ),
            qb.s(
              qb.i(
                `${AppSettings.ontographerContext + "-" + link}/diagram-${
                  i + 1
                }/vertex-${j + 1}`
              ),
              "og:position-y",
              qb.ll(Math.round(vertex.y))
            ),
          ])
        );
      })
    )
  );
  return triples;
}

const Schemes: {
  [key: string]: {
    labels: { [key: string]: string };
    readOnly: boolean;
    namespace: string;
    graph: string;
    color: string;
    vocabulary: string;
  };
} = {};

async function getLegacyDiagrams(
  contextIRI: string,
  contextEndpoint: string
): Promise<typeof Diagrams> {
  const diagrams: typeof Diagrams = [];
  let contextInstance = contextIRI.substring(contextIRI.lastIndexOf("/"));
  let query = [
    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
    "select ?diagram ?index ?name ?color ?active where {",
    "BIND(<" + AppSettings.ontographerContext + "> as ?ogContext).",
    "graph ?ogContext {",
    "?diagram og:context <" + contextIRI + "> .",
    "?diagram og:index ?index .",
    "?diagram og:name ?name .",
    "optional {?diagram og:active ?active}",
    "optional {<" +
      AppSettings.ontographerContext +
      contextInstance +
      "> og:viewColor ?color}",
    "}",
    "}",
  ].join(" ");
  return await processQuery(contextEndpoint, query)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      for (let result of data.results.bindings) {
        if (!(parseInt(result.index.value) in diagrams)) {
          diagrams[parseInt(result.index.value)] = addDiagram(
            Locale[AppSettings.viewLanguage].untitled,
            result.active ? result.active.value === "true" : true
          );
        }
        diagrams[parseInt(result.index.value)].name = result.name.value;
      }
      return diagrams;
    })
    .catch((e) => {
      console.error(e);
      return [];
    });
}

async function getScheme(iris: string[], endpoint: string): Promise<void> {
  const query = [
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
    "PREFIX dct: <http://purl.org/dc/terms/>",
    "SELECT DISTINCT ?scheme ?vocabulary ?namespace ?title",
    "WHERE {",
    "?scheme dct:title ?title.",
    "OPTIONAL {?vocabulary <http://onto.fel.cvut.cz/ontologies/slovník/agendový/popis-dat/pojem/má-glosář> ?scheme.",
    "?vocabulary <http://purl.org/vocab/vann/preferredNamespaceUri> ?namespace.}",
    "filter(?scheme in (<" + iris.join(">, <") + ">))",
    "}",
  ].join(" ");
  await processQuery(endpoint, query)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      if (data.results.bindings.length === 0) return {};
      for (const result of data.results.bindings) {
        if (result.scheme) {
          const iri = result.scheme.value;
          if (!(iri in Schemes))
            Schemes[iri] = {
              labels: {},
              readOnly: false,
              namespace: "",
              graph: "",
              color: "#FFF",
              vocabulary: result.vocabulary.value,
            };
          if (result.title)
            Schemes[iri].labels[result.title["xml:lang"]] = result.title.value;
          if (result.namespace) Schemes[iri].namespace = result.namespace.value;
        }
      }
    })
    .catch((e) => {
      console.error(e);
    });
}

async function getLegacyTerms(
  contextIRI: string,
  contextEndpoint: string
): Promise<typeof WorkspaceTerms> {
  const terms: typeof WorkspaceTerms = {};
  const vocabularyQ = [
    "PREFIX owl: <http://www.w3.org/2002/07/owl#> ",
    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> ",
    "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> ",
    "PREFIX termit: <http://onto.fel.cvut.cz/ontologies/application/termit/>",
    "PREFIX a-popis-dat: <http://onto.fel.cvut.cz/ontologies/slovník/agendový/popis-dat/>",
    "PREFIX dcterms: <http://purl.org/dc/terms/>",
    "select ?vocab (bound(?ro) as ?readOnly) ?label ?title ?vocabLabel",
    "?vocabIRI",
    "where {",
    "BIND(<" + contextIRI + "> as ?contextIRI) . ",
    "OPTIONAL {?contextIRI rdfs:label ?label. }",
    "OPTIONAL {?contextIRI dcterms:title ?title. }",
    "graph ?contextIRI {",
    "?vocab a ?vocabType .",
    "VALUES ?vocabType {",
    "<https://slovník.gov.cz/datový/pracovní-prostor/pojem/slovníkový-kontext> ",
    "<https://slovník.gov.cz/datový/pracovní-prostor/pojem/slovníkový-kontext-pouze-pro-čtení> ",
    "} }",
    "graph ?vocab {",
    "?vocabIRI a <http://onto.fel.cvut.cz/ontologies/slovník/agendový/popis-dat/pojem/glosář> .",
    "?vocabIRI dcterms:title ?vocabLabel .",
    "}",
    "OPTIONAL{ ?vocab a  ?ro . FILTER(?ro = <https://slovník.gov.cz/datový/pracovní-prostor/pojem/slovníkový-kontext-pouze-pro-čtení>) .  } ",
    "}",
  ].join(" ");
  const responseInit: { [key: string]: any }[] = await processQuery(
    contextEndpoint,
    vocabularyQ
  )
    .then((response) => response.json())
    .then((data) => {
      return data.results.bindings;
    })
    .catch(() => false);
  if (responseInit.length === 0) {
  }
  let vocabularies: {
    [key: string]: {
      names: { [key: string]: string };
      readOnly: boolean;
      terms: any;
      graph: string;
    };
  } = {};
  if (responseInit)
    for (const result of responseInit) {
      if (!(result.vocabIRI.value in vocabularies)) {
        vocabularies[result.vocabIRI.value] = {
          readOnly: result.readOnly.value === "true",
          names: {},
          terms: {},
          graph: result.vocab.value,
        };
      }
      vocabularies[result.vocabIRI.value].names[result.vocabLabel["xml:lang"]] =
        result.vocabLabel.value;
    }
  await getScheme(Object.keys(vocabularies), contextEndpoint).catch(
    () => false
  );
  for (const vocab in vocabularies) {
    await fetchConcepts(
      contextEndpoint,
      vocab,
      vocabularies[vocab].terms,
      undefined,
      vocabularies[vocab].graph
    ).catch(() => false);
    Schemes[vocab].readOnly = vocabularies[vocab].readOnly;
    Schemes[vocab].graph = vocabularies[vocab].graph;
    Object.assign(terms, vocabularies[vocab].terms);
  }
  return terms;
}

async function getLegacyConnections(
  contextIRI: string,
  contextEndpoint: string,
  elements: typeof WorkspaceElements
): Promise<typeof WorkspaceLinks> {
  const links: typeof WorkspaceLinks = {};
  let query = [
    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
    "select ?id ?iri ?sourceID ?targetID ?source ?active ?target ?sourceCard1 ?sourceCard2 ?targetCard1 ?targetCard2 ?diagram ?vertex ?type ?index ?posX ?posY where {",
    "?link a og:link .",
    "?link og:id ?id .",
    "?link og:iri ?iri .",
    "?link og:context <" + contextIRI + ">.",
    "?link og:source-id ?sourceID .",
    "?link og:target-id ?targetID .",
    "?link og:source ?source .",
    "?link og:active ?active .",
    "?link og:target ?target .",
    "?link og:type ?type .",
    "?link og:sourceCardinality1 ?sourceCard1 .",
    "?link og:sourceCardinality2 ?sourceCard2 .",
    "?link og:targetCardinality1 ?targetCard1 .",
    "?link og:targetCardinality2 ?targetCard2 .",
    "optional {?link og:vertex ?vertex.",
    "?vertex og:index ?index.",
    "?vertex og:position-x ?posX.",
    "?vertex og:position-y ?posY.",
    "optional {?vertex og:diagram ?diagram.}",
    "}}",
  ].join(" ");
  let iter: {
    [key: string]: {
      iri: string;
      source: string;
      target: string;
      targetID: string;
      sourceID: string;
      vertexIRI: {
        [key: string]: {
          index: number;
          x: number;
          y: number;
          diagram: number;
        };
      };
      vertices: { [key: number]: { [key: number]: { x: number; y: number } } };
      sourceCardinality1: string;
      sourceCardinality2: string;
      targetCardinality1: string;
      targetCardinality2: string;
      active: boolean;
      type: number;
    };
  } = {};
  return await processQuery(contextEndpoint, query)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      for (let result of data.results.bindings) {
        if (!(result.id.value in iter)) {
          iter[result.id.value] = {
            iri: result.iri.value,
            source: result.source.value,
            target: result.target.value,
            targetID: result.targetID.value,
            sourceID: result.sourceID.value,
            active: result.active.value === "true",
            vertexIRI: {},
            vertices: {},
            type:
              result.type.value === "default"
                ? LinkType.DEFAULT
                : LinkType.GENERALIZATION,
            sourceCardinality1: result.sourceCard1.value,
            sourceCardinality2: result.sourceCard2.value,
            targetCardinality1: result.targetCard1.value,
            targetCardinality2: result.targetCard2.value,
          };
        }
        if (
          result.vertex &&
          !(result.vertex.value in iter[result.id.value].vertexIRI)
        )
          iter[result.id.value].vertexIRI[result.vertex.value] = {
            index: parseInt(result.index.value),
            x: parseInt(result.posX.value),
            y: parseInt(result.posY.value),
            diagram: result.diagram ? parseInt(result.diagram.value) : -1,
          };
      }
      for (let link in iter) {
        let convert: { [key: number]: joint.dia.Link.Vertex[] } = {};
        let keys = Object.keys(iter[link].vertexIRI);
        if (keys.length > 0) {
          let skipDeprecated = keys.find((iri: string) =>
            iri.includes("/diagram")
          );
          for (let vertexIRI of keys) {
            if (!vertexIRI.includes("/diagram") && skipDeprecated) continue;
            let vertex = iter[link].vertexIRI[vertexIRI];
            let diagram: number = vertex.diagram !== -1 ? vertex.diagram : 0;
            if (!(diagram in convert)) convert[diagram] = [];
            convert[diagram][vertex.index] = { x: vertex.x, y: vertex.y };
          }
        }
        let sourceID, targetID;
        for (let id in elements) {
          if (elements[id].iri === iter[link].source) sourceID = id;
          if (elements[id].iri === iter[link].target) targetID = id;
          if (targetID && sourceID) break;
        }

        if (targetID && sourceID) {
          let sourceCard = new Cardinality("", "");
          let targetCard = new Cardinality("", "");
          sourceCard.setFirstCardinality(iter[link].sourceCardinality1);
          sourceCard.setSecondCardinality(iter[link].sourceCardinality2);
          targetCard.setFirstCardinality(iter[link].targetCardinality1);
          targetCard.setSecondCardinality(iter[link].targetCardinality2);
          links[link] = {
            iri: iter[link].iri,
            source: sourceID,
            target: targetID,
            sourceCardinality: sourceCard,
            targetCardinality: targetCard,
            type: iter[link].type,
            vertices: convert,
            active: iter[link].active,
          };
          if (sourceID) {
            if (!elements[sourceID].connections.includes(link)) {
              elements[sourceID].connections.push(link);
            }
          }
        }
      }
      return links;
    })
    .catch((e) => {
      console.error(e);
      return {};
    });
}

async function getLegacyElements(
  contextIRI: string,
  contextEndpoint: string
): Promise<typeof WorkspaceElements> {
  const elements: typeof WorkspaceElements = {};
  const query = [
    "PREFIX og: <http://onto.fel.cvut.cz/ontologies/application/ontoGrapher/>",
    "select ?id ?iri ?active ?diagram ?index ?hidden ?posX ?posY ?name ?graph where {",
    "graph ?graph {",
    "?elem a og:element .",
    "?elem og:context <" + contextIRI + ">.",
    "?elem og:iri ?iri .",
    "?elem og:id ?id .",
    "?elem og:active ?active .",
    "?elem og:diagram ?diagram .",
    "optional {?elem og:name ?name.}",
    "optional {?diagram og:index ?index.",
    "?diagram og:hidden ?hidden.",
    "?diagram og:position-x ?posX.",
    "?diagram og:position-y ?posY.",
    "}}",
    "<" +
      contextIRI +
      "> <https://slovník.gov.cz/datový/pracovní-prostor/pojem/odkazuje-na-kontext> ?graph.}",
  ].join(" ");
  return await processQuery(contextEndpoint, query)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      for (const result of data.results.bindings) {
        const id = result.id.value;
        if (!(id in elements)) {
          elements[id] = {
            iri: result.iri.value,
            connections: [],
            diagrams: [],
            hidden: {},
            position: {},
            package: PackageRoot,
            active: result.active.value === "true",
            selectedLabel: initLanguageObject(""),
          };
        }
        if (result.name && !elements[id].selectedLabel[result.name["xml:lang"]])
          elements[id].selectedLabel[result.name["xml:lang"]] =
            result.name.value;
        if (
          result.index &&
          !elements[id].diagrams.includes(parseInt(result.index.value))
        ) {
          elements[id].diagrams.push(parseInt(result.index.value));
          elements[id].position[parseInt(result.index.value)] = {
            x: parseInt(result.posX.value),
            y: parseInt(result.posY.value),
          };
          elements[id].hidden[parseInt(result.index.value)] =
            result.hidden.value === "true";
        }
      }
      return elements;
    })
    .catch((e) => {
      console.error(e);
      return {};
    });
}
