interface StyleData {
  version: string;
  style: Style[];
}

interface Style {
  category: string;
  series: string;
  default: boolean;
  name: string;
  css: string;
  description: string;
}

interface IdStyle extends Style {
  id: string;
}

interface CollectedStyle {
  [category: string]: Category;
}

interface Category {
  standalone: Style[];
  series: {[series: string]: Style[]};
}
