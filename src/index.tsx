import React from 'react';
import ReactDOM from 'react-dom';
import DiagramApp from './main/DiagramApp';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<DiagramApp
	// contextIRI={"https://slovník.gov.cz/datový/pracovní-prostor/pojem/metadatový-kontext/instance1178651091"}
	// contextIRI={"https://slovník.gov.cz/datový/pracovní-prostor/pojem/metadatový-kontext/instance1087289886"}
	// contextEndpoint={"http://localhost:7200/repositories/kodi-uloziste-dev"}
	// contextEndpoint={"https://graphdb.onto.fel.cvut.cz/repositories/kodi-uloziste-dev"}
/>, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
