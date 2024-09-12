# annotation-ui

> This tool streamlines the manual review of synthetically generated Q&A's for
> medical records.

## How to use it

1. Navigate to a directory of your choice and clone a copy of this repo:

   ```sh
   git clone git@github.com:bbj-lab/annotation-ui.git
   cd annotation-ui
   ```

2. Place the supplied csv files of the form `1_chunk_###_to_###.csv` into a
   subfolder `data` inside `annotation-ui`.

3. Create and activate a [conda](https://docs.anaconda.com/miniconda/)
   environment as specified in `environment.yml`:

   ```sh
   conda env create -f environment.yml
   conda activate label_annotator
   ```

   (Instructions for installing miniconda are available
   [here](https://docs.anaconda.com/miniconda/miniconda-install/) if conda is
   not already available on your system.)

4. Depending on port availability, you may need to edit the port number in
   `app.py` to be something other than `5000`:

   ```py
   app.run(debug=True, host='0.0.0.0', port=5000)
   ```

5. Run the app from your terminal:

   ```sh
   python app.py
   ```

   You should get some messages along the lines of:

   ```
   * Running on all addresses (0.0.0.0)
   * Running on http://127.0.0.1:5000
   * Running on http://192.168.86.131:5000
   ```

   where `5000` may be different, depending on the port number selected in
   step 4.

6. Navigate your browser to the address given in the above step. You should
   encounter a screen that looks like this:

    <img src="./img/Screenshot 2024-09-12 at 12.45.16.png" alt="welcome screen" style="max-width:500px; width:100%; margin:auto; border:1px solid"/>

   Select a file from the `data` folder.

7. The screen should now look like this:

   <img src="./img/Screenshot 2024-09-12 at 12.45.35.png" alt="example display" style="max-width: 500px; width:100%; margin:auto; border:1px solid"/>

   On the left hand side, you will find the file name at the top, followed by
   the text of the note.

   On the right, there is a navigation tool to allow you to move between notes.
   Next is the answer (Yes/No/Not specified), followed by the Question,
   Question type, Section, Source, and Explanation. Modify as needed. If the
   question cannot be salvaged, select "Invalid Label". After modifications,
   click "Save" to navigate to the next question. If no modification is
   necessary, click "Next" at the top to proceed.

8. In the subfolder `annotated`, you will now find the annotated version of
   your csv file.

<!---

Format with:
```
prettier --write --print-width 79 --prose-wrap always **/*.md
```

-->
