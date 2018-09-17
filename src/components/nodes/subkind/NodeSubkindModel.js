import { NodeModel, DiagramEngine } from "storm-react-diagrams";
import {NodeSubkindPortModel} from "./NodeSubkindPortModel";
import {AttributeObject} from "../common/AttributeObject";

export class NodeSubkindModel extends NodeModel {
    constructor(name: string = "New Subkind", color: string = "white") {
        super("subkind");
        this.name = name;
        this.color = color;
        this.attributes = [];
        this.addPort(new NodeSubkindPortModel("left"));
        this.addPort(new NodeSubkindPortModel("right"));
        this.addPort(new NodeSubkindPortModel("top"));
        this.addPort(new NodeSubkindPortModel("bottom"));
    }
    changeName(str: string){
        this.name = str;
    }

    getAttributes(){
        return this.attributes;
}
    getAttribute(id: number){
        return this.attributes[id];
    }
    addAttribute(attribute: AttributeObject){
        this.attributes.push(attribute);
    }

    removeAttribute(attribute: AttributeObject){
        const index = this.attributes.find(attribute);
        this.attributes.splice(index,1);
    }
    setAttribute(attribute: AttributeObject){
        this.attributes[this.attributes.find(attribute)] = attribute;
    }

    deSerialize(object, engine: DiagramEngine) {
        super.deSerialize(object, engine);
        this.name = object.name;
        this.color = object.color;
        let atts = [];
        _.forEach(object.attributes, (attribute: any) => {
            atts.push(attribute);
        });
        this.attributes = atts;
    }

    serialize() {
        return _.merge(super.serialize(), {
            name: this.name,
            color: this.color,
            attributes: _.map(this.attributes, attribute => {
                return {
                    first: attribute.first,
                    second: attribute.second
                };
            })
        });
    }
}