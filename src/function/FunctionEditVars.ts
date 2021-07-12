import {
  AppSettings,
  Diagrams,
  Languages,
  Links,
  PackageRoot,
  Prefixes,
  Stereotypes,
  WorkspaceElements,
  WorkspaceLinks,
  WorkspaceTerms,
  WorkspaceVocabularies,
} from "../config/Variables";
import { graph } from "../graph/Graph";
import { addClass } from "./FunctionCreateVars";
import { LinkConfig } from "../config/logic/LinkConfig";
import { LinkType } from "../config/Enum";
import { Locale } from "../config/Locale";
import { updateDeleteTriples } from "../queries/update/UpdateMiscQueries";
import { Cardinality } from "../datatypes/Cardinality";
import { graphElement } from "../graph/GraphElement";
import {
  getElemFromIRI,
  getVocabularyFromScheme,
  getWorkspaceContextIRI,
} from "./FunctionGetVars";

export function getName(element: string, language: string): string {
  if (element in Stereotypes) {
    return Stereotypes[element].labels[language];
  } else {
    return WorkspaceTerms[element].labels[language];
  }
}

export function getStereotypeList(iris: string[], language: string): string[] {
  let result: string[] = [];
  iris.forEach((iri) => {
    if (iri in Stereotypes) {
      result.push(Stereotypes[iri].labels[language]);
    }
  });
  return result;
}

export function initVars() {
  loadLanguages();
  initProjectSettings();
  loadUML();
}

export function loadUML() {
  const scheme = AppSettings.ontographerContext + "/uml";

  WorkspaceVocabularies[scheme] = {
    labels: initLanguageObject("UML"),
    readOnly: true,
    namespace: "",
    graph: AppSettings.ontographerContext,
    color: "#FFF",
    count: 0,
    glossary: scheme,
  };

  for (const type in LinkConfig) {
    const intType = parseInt(type, 10);
    if (intType !== LinkType.DEFAULT) {
      Links[scheme + "/" + LinkConfig[type].labels["en"]] = {
        subClassOfDomain: [],
        subClassOfRange: [],
        labels: LinkConfig[type].labels,
        definitions: initLanguageObject(""),
        inScheme: scheme,
        type: intType,
        domain: "",
        range: "",
        inverseOf: "",
        defaultSourceCardinality: new Cardinality("", ""),
        defaultTargetCardinality: new Cardinality("", ""),
      };
    }
  }
}

export function loadLanguages() {
  const json = require("../config/Languages.json");
  for (const code in json) {
    if (json.hasOwnProperty(code)) Languages[code] = json[code];
  }
  const language = navigator.language.slice(0, 2);
  AppSettings.viewLanguage = language in Languages ? language : "en";
  Diagrams[0].name = Locale[AppSettings.viewLanguage].untitled;
}

export function initProjectSettings() {
  AppSettings.name = initLanguageObject(
    Locale[AppSettings.viewLanguage].untitledProject
  );
  AppSettings.description = initLanguageObject("");
  AppSettings.selectedDiagram = 0;
}

export function initLanguageObject(def: any) {
  let result: { [key: string]: any } = {};
  for (const code in Languages) {
    result[code] = def;
  }
  return result;
}

export function parsePrefix(prefix: string, name: string): string {
  return Prefixes[prefix] + name;
}

export function deletePackageItem(id: string): string[] {
  const folder = WorkspaceElements[id].package;
  const iri = WorkspaceElements[id].iri;
  let queries: string[] = [];
  folder.elements.splice(folder.elements.indexOf(id), 1);
  for (const connection of WorkspaceElements[id].connections) {
    WorkspaceLinks[connection].active = false;
    queries.push(
      updateDeleteTriples(
        AppSettings.ontographerContext + "-" + connection,
        [getWorkspaceContextIRI()],
        true,
        false,
        false
      )
    );
  }
  const targets = Object.keys(WorkspaceLinks).filter(
    (link) => WorkspaceElements[WorkspaceLinks[link].target].iri === iri
  );
  for (const connection of targets) {
    WorkspaceLinks[connection].active = false;
    queries.push(
      updateDeleteTriples(
        AppSettings.ontographerContext + "-" + connection,
        [getWorkspaceContextIRI()],
        true,
        false,
        false
      )
    );
  }
  targets.forEach((target) => {
    const elem = Object.keys(WorkspaceElements).find((elem) =>
      WorkspaceElements[elem].connections.includes(target)
    );
    if (elem)
      WorkspaceElements[elem].connections.splice(
        WorkspaceElements[elem].connections.indexOf(target),
        1
      );
  });
  WorkspaceTerms[WorkspaceElements[id].iri].labels = initLanguageObject("");
  WorkspaceElements[id].connections = [];
  if (graph.getCell(id)) {
    graph.removeCells([graph.getCell(id)]);
  }
  WorkspaceElements[id].active = false;
  return queries;
}

export function setElementShape(
  elem: joint.dia.Element,
  width: number,
  height: number
) {
  const types = WorkspaceTerms[WorkspaceElements[elem.id].iri].types;
  elem.attr({
    bodyBox: { display: "none" },
    bodyEllipse: { display: "none" },
    bodyTrapezoid: { display: "none" },
    bodyDiamond: { display: "none" },
    label: { color: "black" },
  });
  if (types.includes(parsePrefix("z-sgov-pojem", "typ-objektu"))) {
    elem.attr({
      bodyBox: {
        display: "block",
        width: width,
        height: height,
        strokeDasharray: "none",
        stroke: "black",
        fill: WorkspaceVocabularies[
          getVocabularyFromScheme(
            WorkspaceTerms[WorkspaceElements[elem.id].iri].inScheme
          )
        ].color,
      },
    });
  } else if (types.includes(parsePrefix("z-sgov-pojem", "typ-vlastnosti"))) {
    elem.attr({
      bodyEllipse: {
        display: "block",
        rx: width * (3 / 5),
        ry: height * (2 / 3),
        cx: width / 2,
        cy: height / 2,
        stroke: "black",
        fill: WorkspaceVocabularies[
          getVocabularyFromScheme(
            WorkspaceTerms[WorkspaceElements[elem.id].iri].inScheme
          )
        ].color,
      },
    });
  } else if (types.includes(parsePrefix("z-sgov-pojem", "typ-vztahu"))) {
    elem.attr({
      bodyDiamond: {
        display: "block",
        points: `${width / 2},${-(height / 2)} ${width * (9 / 8)},${
          height / 2
        } ${width / 2},${height * (3 / 2)} ${-(width / 8)},${height / 2}`,
        stroke: "black",
        fill: WorkspaceVocabularies[
          getVocabularyFromScheme(
            WorkspaceTerms[WorkspaceElements[elem.id].iri].inScheme
          )
        ].color,
      },
    });
  } else if (types.includes(parsePrefix("z-sgov-pojem", "typ-události"))) {
    elem.attr({
      bodyTrapezoid: {
        display: "block",
        points: `20,0 ${width - 20},0 ${width},${height} 0,${height}`,
        stroke: "black",
        fill: WorkspaceVocabularies[
          getVocabularyFromScheme(
            WorkspaceTerms[WorkspaceElements[elem.id].iri].inScheme
          )
        ].color,
      },
    });
  } else {
    elem.attr({
      bodyBox: {
        display: "block",
        width: width,
        height: height,
        strokeDasharray: "10,10",
        stroke: "grey",
        fill: WorkspaceVocabularies[
          getVocabularyFromScheme(
            WorkspaceTerms[WorkspaceElements[elem.id].iri].inScheme
          )
        ].color,
      },
      label: { color: "grey" },
    });
  }
}

export function initElements() {
  let ids: string[] = [];
  for (const iri in WorkspaceTerms) {
    if (!getElemFromIRI(iri)) {
      let pkg = PackageRoot.children.find(
        (pkg) => pkg.scheme === WorkspaceTerms[iri].inScheme
      );
      const id = new graphElement().id as string;
      if (pkg) {
        addClass(id, iri, pkg);
        ids.push(id);
      }
    }
  }
  return ids;
}
