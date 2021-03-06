import { graph } from "../graph/Graph";
import {
  drawGraphElement,
  highlightCell,
  unHighlightCell,
} from "./FunctionDraw";
import { getElementShape } from "./FunctionGetVars";
import { paper } from "../main/DiagramCanvas";
import { PackageNode } from "../datatypes/PackageNode";
import { graphElement } from "../graph/GraphElement";
import {
  addClass,
  addVocabularyElement,
  createNewElemIRI,
} from "./FunctionCreateVars";
import { initElements, parsePrefix } from "./FunctionEditVars";
import {
  AppSettings,
  Diagrams,
  WorkspaceElements,
  WorkspaceLinks,
  WorkspaceTerms,
} from "../config/Variables";
import * as joint from "jointjs";
import {
  updateProjectElement,
  updateProjectElementDiagram,
} from "../queries/update/UpdateElementQueries";
import {
  updateProjectLink,
  updateProjectLinkVertices,
} from "../queries/update/UpdateLinkQueries";
import { Representation } from "../config/Enum";
import { Locale } from "../config/Locale";
import {
  fetchReadOnlyTerms,
  fetchRelationships,
} from "../queries/get/CacheQueries";
import { initConnections } from "./FunctionRestriction";
import { restoreHiddenElem, setRepresentation } from "./FunctionGraph";
import React from "react";
import { insertNewCacheTerms, insertNewRestrictions } from "./FunctionCache";

export function resizeElem(id: string) {
  let view = paper.findViewByModel(id);
  if (view) {
    let bbox = view.getBBox();
    let cell = graph.getCell(id);
    let links = graph.getConnectedLinks(cell);
    for (let link of links) {
      if (link.getSourceCell()?.id === id) {
        link.source({ x: bbox.x, y: bbox.y });
      } else {
        link.target({ x: bbox.x, y: bbox.y });
      }
    }
    if (typeof cell.id === "string") {
      unHighlightCell(cell.id);
      highlightCell(cell.id);
    }
    for (let link of links) {
      if (link.getSourceCell() === null) {
        link.source({
          id: id,
          connectionPoint: {
            name: "boundary",
            args: { selector: getElementShape(id) },
          },
        });
      } else {
        link.target({
          id: id,
          connectionPoint: {
            name: "boundary",
            args: { selector: getElementShape(id) },
          },
        });
      }
    }
  }
}

export function createNewConcept(
  point: { x: number; y: number },
  name: { [key: string]: string },
  language: string,
  pkg: PackageNode
) {
  let cls = new graphElement();
  let p = paper.clientToLocalPoint(point);
  let id = cls.id as string;
  let iri = createNewElemIRI(pkg.scheme, name[language]);
  addVocabularyElement(iri, pkg.scheme, [parsePrefix("skos", "Concept")]);
  addClass(id, iri, pkg);
  WorkspaceElements[cls.id].hidden[AppSettings.selectedDiagram] = false;
  if (p) {
    cls.set("position", { x: p.x, y: p.y });
    WorkspaceElements[cls.id].position[AppSettings.selectedDiagram] = {
      x: p.x,
      y: p.y,
    };
  }
  WorkspaceTerms[iri].labels = name;
  cls.addTo(graph);
  let bbox = paper.findViewByModel(cls).getBBox();
  if (bbox) cls.resize(bbox.width, bbox.height);
  drawGraphElement(cls, language, AppSettings.representation);
  return id;
}

export function getElementToolPosition(
  id: string | number,
  topRight: boolean = false
): { x: number | string; y: number | string } {
  switch (getElementShape(id)) {
    case "bodyEllipse":
      return topRight ? { x: "85%", y: "15%" } : { x: "15%", y: "15%" };
    case "bodyTrapezoid":
      return topRight ? { x: "100%", y: 0 } : { x: 20, y: 0 };
    case "bodyDiamond":
      return topRight ? { x: "75%", y: "25%" } : { x: "25%", y: "25%" };
    case "bodyBox":
      return topRight ? { x: "100%", y: 0 } : { x: 0, y: 0 };
    default:
      return topRight ? { x: "100%", y: 0 } : { x: 0, y: 0 };
  }
}

export function isElementHidden(id: string, diagram: number) {
  return (
    WorkspaceElements[id].hidden[diagram] ||
    WorkspaceElements[id].hidden[diagram] === undefined
  );
}

/**
 * Checks if the position of the element on the canvas differs from the position saved in the model.
 * @param elem The element to check
 */
export function isElementPositionOutdated(elem: joint.dia.Element) {
  const position = elem.position();
  const id = elem.id;
  return (
    position.x !==
      WorkspaceElements[id].position[AppSettings.selectedDiagram].x ||
    position.y !== WorkspaceElements[id].position[AppSettings.selectedDiagram].y
  );
}

/**
 * Moves elements on the canvas along with affected links (if applicable).
 * This function is to be called on a 'element:pointerup' event.
 * Returns update queries (to be pushed into the remote DB).
 * @param sourceElem ID of event source.
 * @param evt Mouse event.
 */
export function moveElements(
  sourceElem: joint.dia.Element,
  evt: JQuery.MouseUpEvent
): string[] {
  // get the selection rectangle data
  const { rect, bbox, ox, oy } = evt.data;
  const sourceID = sourceElem.id as string;
  if (rect) rect.remove();
  const movedLinks: string[] = [];
  const movedElems: string[] = [sourceID];
  WorkspaceElements[sourceID].position[AppSettings.selectedDiagram] =
    sourceElem.position();
  for (const id of AppSettings.selectedElements) {
    const elem = graph.getElements().find((elem) => elem.id === id);
    if (elem && id !== sourceID && bbox && ox && oy) {
      // calculate and save the new element positions
      const oldPos = elem.position();
      const diff = new joint.g.Point(bbox.x, bbox.y).difference(ox, oy);
      elem.position(
        oldPos.x + diff.x / Diagrams[AppSettings.selectedDiagram].scale,
        oldPos.y + diff.y / Diagrams[AppSettings.selectedDiagram].scale
      );
      // generate queries only if the position changed
      if (isElementPositionOutdated(elem)) {
        WorkspaceElements[id].position[AppSettings.selectedDiagram] =
          elem.position();
        movedElems.push(id);
        for (const link of graph.getConnectedLinks(elem)) {
          // if there are any connected links with vertices, calculate and save the new vertex positions
          const linkID = link.id as string;
          if (!movedLinks.includes(linkID) && link.vertices().length > 0) {
            movedLinks.push(linkID);
            link.vertices().forEach((vert, i) => {
              link.vertex(i, {
                x:
                  vert.x + diff.x / Diagrams[AppSettings.selectedDiagram].scale,
                y:
                  vert.y + diff.y / Diagrams[AppSettings.selectedDiagram].scale,
              });
            });
            WorkspaceLinks[linkID].vertices[AppSettings.selectedDiagram] =
              link.vertices();
          }
        }
      }
    }
  }
  const queries: string[] = [];
  if (movedElems.length > 0)
    queries.push(
      updateProjectElementDiagram(AppSettings.selectedDiagram, ...movedElems)
    );
  if (movedLinks.length > 0)
    queries.push(
      updateProjectLinkVertices(AppSettings.selectedDiagram, ...movedLinks)
    );
  return queries;
}

export async function putElementsOnCanvas(
  event: React.DragEvent<HTMLDivElement>,
  handleStatus: Function
): Promise<string[]> {
  let queries: string[] = [];
  if (event.dataTransfer) {
    const data = JSON.parse(event.dataTransfer.getData("newClass"));
    const iris = data.iri.filter((iri: string) => !(iri in WorkspaceTerms));
    const ids = data.id;
    if (iris.length > 0) {
      handleStatus(
        true,
        Locale[AppSettings.viewLanguage].downloadingTerms,
        true,
        false
      );
      insertNewCacheTerms(
        await fetchReadOnlyTerms(AppSettings.contextEndpoint, iris)
      );
      insertNewRestrictions(
        await fetchRelationships(AppSettings.contextEndpoint, iris)
      );
      const newIDs = initElements();
      await queries.push(updateProjectElement(false, ...newIDs));
      await queries.push(updateProjectLink(false, ...initConnections()));
      ids.push(...newIDs);
    }
    const matrixLength = Math.max(ids.length, iris.length);
    const matrixDimension = Math.ceil(Math.sqrt(matrixLength));
    ids
      .filter((id: string) => !graph.getCell(id))
      .forEach((id: string, i: number) => {
        const cls = new graphElement({ id: id });
        const point = paper.clientToLocalPoint({
          x: event.clientX,
          y: event.clientY,
        });
        if (matrixLength > 1) {
          const x = i % matrixDimension;
          const y = Math.floor(i / matrixDimension);
          cls.set("position", { x: point.x + x * 200, y: point.y + y * 200 });
          WorkspaceElements[id].position[AppSettings.selectedDiagram] = {
            x: point.x + x * 200,
            y: point.y + y * 200,
          };
        } else {
          cls.set("position", { x: point.x, y: point.y });
          WorkspaceElements[id].position[AppSettings.selectedDiagram] = {
            x: point.x,
            y: point.y,
          };
        }
        WorkspaceElements[id].hidden[AppSettings.selectedDiagram] = false;
        cls.addTo(graph);
        drawGraphElement(
          cls,
          AppSettings.selectedLanguage,
          AppSettings.representation
        );
        queries.push(
          ...restoreHiddenElem(id, cls, true, true, true),
          updateProjectElementDiagram(AppSettings.selectedDiagram, id)
        );
      });
    if (AppSettings.representation === Representation.COMPACT)
      setRepresentation(AppSettings.representation);
  }
  return queries;
}
