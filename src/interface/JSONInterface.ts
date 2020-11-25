import {Links, ProjectSettings, Schemes, Stereotypes} from "../config/Variables";
import {fetchConcepts, getAllTypes, getScheme} from "./SPARQLInterface";
import {createValues} from "../function/FunctionCreateVars";
import {initLanguageObject} from "../function/FunctionEditVars";
import {checkLabels} from "../function/FunctionGetVars";
import {Locale} from "../config/Locale";

export async function getVocabulariesFromRemoteJSON(pathToJSON: string): Promise<boolean> {
    const isURL = require('is-url');
    if (isURL(pathToJSON)) {
        await fetch(pathToJSON).then(response => response.json()).then(
            async json => {
                for (const key of Object.keys(json)) {
                    let data = json[key];
                    if (data.type === "stereotype") {
                        await getScheme(data.sourceIRI, data.endpoint, data.type === "model");
                        Schemes[data.sourceIRI].labels = initLanguageObject(key);
                        await fetchConcepts(
                            data.endpoint,
                            data.sourceIRI,
                            Stereotypes,
                            false,
                            undefined,
                            false,
                            undefined,
                            true,
                            [data.classIRI],
                            data.values ? createValues(data.values, data.prefixes) : undefined
                        );
                        await fetchConcepts(
                            data.endpoint,
                            data.sourceIRI,
                            Links,
                            false,
                            undefined,
                            false,
                            undefined,
                            true,
                            [data.relationshipIRI],
                            data.values ? createValues(data.values, data.prefixes) : undefined
                        );
                        checkLabels();
                        for (let link in Links) {
                            Links[link].typesDomain = [];
                            Links[link].typesRange = [];
                            Links[link].subClassOfDomain = [];
                            Links[link].subClassOfRange = [];
                        }
                        await Promise.all(Object.keys(Stereotypes).map(stereotype =>
                            getAllTypes(
                                stereotype,
                                data.endpoint,
                                Stereotypes[stereotype].types,
                                Stereotypes[stereotype].subClassOf)))
                        await Promise.all(Object.keys(Links).map(link =>
                            getAllTypes(
                                Links[link].domain,
                                data.endpoint,
                                Links[link].typesDomain,
                                Links[link].subClassOfDomain, true)
                        ))
                        await Promise.all(Object.keys(Links).map(link =>
                            getAllTypes(
                                Links[link].range,
                                data.endpoint,
                                Links[link].typesRange,
                                Links[link].subClassOfRange, true)
                        ))
                    }
                }
            }
        ).catch((error) => {
            console.log(error);
            return false;
        });
        return true;
    } else {
        throw new Error(Locale[ProjectSettings.viewLanguage].vocabularyNotFound)
    }
}