use appState.formData for everything: 
- all user answers must be saved into appState.formData as key-value pairs
- review screen (renderReviewScreen) and PDF builder (generateCountyPDF) read directly from this object

Match input 'name' attributes
- every text box, dropdown, or checkbox needs a 'name' attribute
- make sure those 'name' strings match the exact field keys we have for the county form so pdf-lib can find and fill them

Function trigger links
- when the user passes validation on step 3 and moves to step 4, make sure to call renderReviewScreen() so the review cards actually populate with what they typed
- when the user clicks the final download button, hook it up to call downloadAndWipe
