'use strict'

// web_assets/js/IndexCoordinator.entry.js

class IndexClass {
    initialize() {
        console.log('Test');
        window.alert('Build Successful!!');
    }
}

let obj = new IndexClass();

window.setTimeout(()=>{ obj.initialize(); }, 1000);
