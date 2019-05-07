//Generalization is needed for exporting.

// LinkEnd, Labeled, Dashed, OCL Constraints
import {Locale} from "./Locale";
import {Constraint} from "../components/misc/Constraint";

export var LinkPool = {
    "Characterization": ["Empty", true, false, [new Constraint("self.width = 2","Characterization")]],
    "Component": ["FilledEmptyDiamond", false, false, []],
    "Derivation": ["Empty", false, true, []],
    "Formal": ["Empty", true, false, []],
    "Material": ["Empty", true, false, []],
    "Mediation": ["Empty", true, false, []],
    "Member": ["FilledMDiamond", true, false, []],
    "SubCollection": ["FilledCDiamond", true, false, []],
    "SubQuantity": ["FilledQDiamond", true, false, []]
};

LinkPool[Locale.generalization] = ["UnfilledArrow", false, false, []];

// xy1: top,
// xy2: right,
// xy3: bottom,
// xy4: left

export var LinkEndPool = {
    "Empty": {
        x1: 0,
        y1: -1,
        x2: 1,
        y2: 0,
        x3: 0,
        y3: 1,
        x4: -1,
        y4: 0,
        text: "",
        fill: true
    },
    "FilledEmptyDiamond": {
        x1: 0,
        y1: -10,
        x2: 12,
        y2: 0,
        x3: 0,
        y3: 10,
        x4: -12,
        y4: 0,
        text: "",
        fill: true
    },
    "UnfilledArrow": {
        x1: -10,
        y1: -8,
        x2: 3,
        y2: 0,
        x3: -10,
        y3: 8,
        x4: -10,
        y4: 8,
        text: "",
        fill: false
    },
    "FilledMDiamond": {
        x1: 0,
        y1: -10,
        x2: 12,
        y2: 0,
        x3: 0,
        y3: 10,
        x4: -12,
        y4: 0,
        text: "M",
        fill: true
    },
    "FilledCDiamond": {
        x1: 0,
        y1: -10,
        x2: 12,
        y2: 0,
        x3: 0,
        y3: 10,
        x4: -12,
        y4: 0,
        text: "C",
        fill: true
    },
    "FilledQDiamond": {
        x1: 0,
        y1: -10,
        x2: 12,
        y2: 0,
        x3: 0,
        y3: 10,
        x4: -12,
        y4: 0,
        text: "Q",
        fill: true
    }
};