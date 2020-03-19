import React from 'react';
import MenuPanel from "../panels/MenuPanel";
import ElementPanel from "../panels/ElementPanel";
import DiagramCanvas from "./DiagramCanvas";
import * as Locale from "../locale/LocaleMain.json";
import * as VariableLoader from "../var/VariableLoader";
import {
    AttributeTypePool,
    CardinalityPool,
    Diagrams,
    graph,
    Languages,
    Links,
    ModelElements,
    PackageRoot,
    ProjectElements,
    ProjectLinks,
    ProjectSettings,
    PropertyPool,
    StereotypeCategories,
    Stereotypes
} from "../var/Variables";
import DetailPanel from "../panels/DetailPanel";
import {getVocabulariesFromJSONSource} from "../interface/JSONInterface";
import * as SemanticWebInterface from "../interface/SemanticWebInterface";
import {Defaults} from "../config/Defaults";
import {getName, saveDiagram} from "../misc/Helper";
import {PackageNode} from "../components/PackageNode";

interface DiagramAppProps{
    readonly?: boolean;
    loadClasses?: string;
    loadClassesName?: string;
    classIRI?: string;
    loadLanguage?: string;
    loadRelationshipsName?: string;
    loadRelationships?: string;
    relationshipIRI?: string;
    loadDefaultVocabularies?: boolean;
}

interface DiagramAppState{
    // projectName: {[key:string]: string};
    // projectDescription: {[key:string]: string};
    projectLanguage: string;
    saveString: string;
    selectedLink: string;
    detailPanelHidden: boolean;
    //theme: "light" | "dark";
}

require("../scss/style.scss");

export default class DiagramApp extends React.Component<DiagramAppProps, DiagramAppState>{
    private readonly canvas: React.RefObject<DiagramCanvas>;
    private readonly elementPanel: React.RefObject<ElementPanel>;
    private readonly detailPanel: React.RefObject<DetailPanel>;

    constructor(props: DiagramAppProps) {
        super(props);

        this.canvas = React.createRef();
        this.elementPanel = React.createRef();
        this.detailPanel = React.createRef();

        VariableLoader.initVars();

        this.state = ({
            // projectName: VariableLoader.initLanguageObject(Locale.untitledProject),
            // projectDescription: VariableLoader.initLanguageObject(""),
            //theme: "light",
            projectLanguage: Object.keys(Languages)[0],
            selectedLink: Object.keys(Links)[0],
            saveString: "",
            detailPanelHidden: false
        });


        document.title = ProjectSettings.name[this.state.projectLanguage] + " | " + Locale.ontoGrapher;
        this.handleChangeSelectedLink = this.handleChangeSelectedLink.bind(this);
        this.handleChangeLanguage = this.handleChangeLanguage.bind(this);
        this.newProject = this.newProject.bind(this);
        //this.saveOGsettings = this.saveOGsettings.bind(this);
        this.loadProject = this.loadProject.bind(this);
        this.saveProject = this.saveProject.bind(this);
        //this.saveProjectSettings = this.saveProjectSettings.bind(this);
        //this.handleChangeSelectedModel = this.handleChangeSelectedModel.bind(this);
        this.prepareDetails = this.prepareDetails.bind(this);
    }

    componentDidMount(): void {
        if (typeof this.props.loadClasses === "string"){
            SemanticWebInterface.fetchClasses(this.props.loadClassesName, this.props.loadClasses, this.props.classIRI, true, this.props.loadLanguage, ()=>{
                this.forceUpdate();
            });
        }
        if (typeof this.props.loadRelationships === "string"){
            SemanticWebInterface.fetchRelationships(this.props.loadRelationshipsName, this.props.loadRelationships, this.props.relationshipIRI, true, this.props.loadLanguage, ()=>{
                this.forceUpdate();
            });
        }
        if (this.props.loadDefaultVocabularies){
            getVocabulariesFromJSONSource(Defaults.defaultVocabularies, ()=>{
                this.forceUpdate();
                this.handleChangeSelectedLink(Object.keys(Links)[0]);
                
                this.elementPanel.current?.update();
            });
        }

    }

    prepareDetails(id: string){
        this.detailPanel.current?.prepareDetails(id);
    }
    //
    // handleChangeSelectedModel(model: string){
    //     console.log(model);
    //     this.setState({selectedModel: model});
    // }

    handleChangeLanguage(languageCode: string){
        this.setState({projectLanguage: languageCode});
        document.title = ProjectSettings.name[languageCode] + " | " + Locale.ontoGrapher;
        graph.getCells().forEach((cell) => {
            cell.prop('attrs/label/text', "«"+ getName(ProjectElements[cell.id].iri, this.state.projectLanguage).toLowerCase() +"»" + "\n" + ProjectElements[cell.id].names[languageCode]);
        });
    }

    newProject(){
        VariableLoader.initProjectSettings();
        this.setState({projectLanguage: Object.keys(Languages)[0],
            selectedLink: Object.keys(Links)[0],
            saveString: ""});
        Diagrams.length = 0;
        Diagrams.push([Locale.untitled, {}]);
        StereotypeCategories.length = 0;
        Object.keys(ProjectElements).forEach(el => delete ProjectElements[el]);
        Object.keys(ProjectLinks).forEach(el => delete ProjectLinks[el]);
        PackageRoot.elements = [];
        PackageRoot.children = [];
        this.elementPanel.current?.update();
    }

    loadProject(loadString: string){
        let save = JSON.parse(loadString);
        this.newProject();
        this.setState({
            selectedLink: save.selectedLink,
            projectLanguage: save.projectLanguage
        });
        for (let key in save.projectElements){
            ProjectElements[key] = save.projectElements[key];
        }
        for (let key in save.projectLinks){
            ProjectLinks[key] = save.projectLinks[key];
        }
        ProjectSettings.name = save.projectSettings.name;
        ProjectSettings.description = save.projectSettings.description;
        ProjectSettings.selectedDiagram = save.projectSettings.selectedDiagram;
        save.diagrams.forEach((diagram: { [key: string]: any; })=>{Diagrams.push(diagram)});
        this.elementPanel.current?.update();
        this.loadPackages(save.packageRoot);
    }

    loadPackages(list: {trace: number[], elements: string[], name: string}[]){
        for (let pkg of list){
            let iter = PackageRoot;
            for (let i = 0; i < pkg.trace.length; i++){
                iter = iter.children[pkg.trace[i]];
            }
            let newpkg = new PackageNode(pkg.name, iter, false);
            newpkg.elements = pkg.elements;
            iter.children.push(newpkg);
        }
    }

    savePackages(){
        let result = [];
        let level = 0;
        let q = [];
        q.push(PackageRoot);
        q.push(undefined);
        while(q.length > 0){
            let p = q.shift();
            if (p === undefined){
                level++;
                q.push(undefined);
                if (q[0] === undefined) break;
                else continue;
            }
            let trace: number[] = [];
            let iter = p;
            while (iter !== PackageRoot) {
                let parent = iter.parent;
                if (parent) {
                    trace.unshift(parent.children.indexOf(iter));
                    iter = parent;
                } else break;
            }
            trace.shift();
            result.push({
                name: p.name,
                trace: trace,
                elements: p.elements,
            });

            for (let sp of p.children){
                q.push(sp);
            }
        }
        return result;
    }

    saveProject(){
        Diagrams[ProjectSettings.selectedDiagram].json = saveDiagram();
        let save = {
            projectElements: ProjectElements,
            projectLinks: ProjectLinks,
            projectSettings: {name: ProjectSettings.name, description: ProjectSettings.description},
            selectedLink: this.state.selectedLink,
            projectLanguage: this.state.projectLanguage,
            diagrams: Diagrams,
            packageRoot: this.savePackages(),
            //loaded things
            stereotypes: Stereotypes,
            stereotypeCategories: StereotypeCategories,
            modelElements: ModelElements,
            links: Links,
            languages: Languages,
            properties: PropertyPool,
            attributes: AttributeTypePool,
            cardinalities: CardinalityPool
        };
        //keep this .log
        console.log(save);
        this.setState({saveString: (JSON.stringify(save))});
    }
    //
    //
    // saveProjectSettings(save: {[key:string]: string}){
    //     // this.setState({
    //     //     projectName: save.projectName
    //     // });
    // }

    handleChangeSelectedLink(linkType: string) {
        this.setState({selectedLink: linkType});
    }

    // saveOGsettings(input: any){
    //     this.setState({
    //         theme: input.theme
    //     })
    // }

    hide(id:string, diagram: number){
        ProjectElements[id].hidden[diagram] = true;
    }

    render(){
        return(<div className={"app"}>
            <MenuPanel
                newProject={this.newProject}
                projectLanguage={this.state.projectLanguage}
                saveProject={this.saveProject}
                loadProject={this.loadProject}
                //saveProjectSettings={this.saveProjectSettings}
                saveString={this.state.saveString}
                //theme={this.state.theme}
                handleChangeLanguage={this.handleChangeLanguage}
                update={()=>{this.elementPanel.current?.update();}}
                //saveOGSettings={this.saveOGsettings}
            />
            <ElementPanel
                ref={this.elementPanel}
                projectLanguage={this.state.projectLanguage}
                handleChangeSelectedLink={this.handleChangeSelectedLink}
                selectedLink={this.state.selectedLink}

            />
            <DetailPanel
                ref={this.detailPanel}
                projectLanguage={this.state.projectLanguage}
            />
            <DiagramCanvas
                hide={this.hide}
                ref={this.canvas}
                selectedLink={this.state.selectedLink}
                projectLanguage={this.state.projectLanguage}
                prepareDetails={this.prepareDetails}
                hideDetails={() => {this.detailPanel.current?.hide();}}
                addCell={() => {this.elementPanel.current?.forceUpdate();}}
            />
        </div>);
  }
}