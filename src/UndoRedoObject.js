
class UndoRedoObject {

  constructor(undoRedoFunction) {

    this.undoRedoFunction = undoRedoFunction;

  }

  commit() {
    this.undoRedoFunction();
  }

}

export default UndoRedoObject;
