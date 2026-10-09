1. extraction
   - inspect PDF form fields to list every native PDF key
   - group the fields into data buckets: vendor details, event details, operational stuff, and food safety/sanitation confirmations
   - identify which fields require standard text strings, numerical inputs, or boolean states to make sure pdf-lib handles them correcly
2. simplification
   - take bureaucratic original and convert into plain english question
   - specify how the user answers the question on the UI (text box, dropdown menu, yes/no options)
3. translation
  - build structure matrix for all 4 languages: English, Spanish, Mandarin, Hindi
  - each question is tied to a unique identifier key so the app knows which question the user is answering regardless of the active language setting   
4. data and storage
   - store in a dedicated external JSON file
   - configure javascript to fetch and parse this JSON file into memory when application initializes 
5. mapping answers to PDF form fields
- when user completes the questionnare, the engine takes the value from the variable and injects it into the text field
- based on the decision tree choice, the engine tragets the coodinate or box name in the PDF form before triggering the local pdf-lib download
- ensure that right after the pdf-lif blob is complied and downloaded, the browser runtime memory cache clears all form data variables (privacy policy)
