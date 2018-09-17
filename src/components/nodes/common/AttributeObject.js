import {DiagramEngine} from "storm-react-diagrams";

export class AttributeObject {
    first: string;
    second: string;

    constructor(first: string, second: string){
        this.first = first;
        this.second = second;
    }

    getFirst(){
        return this.first;
    }

    getSecond(){
        return this.second;
    }
}