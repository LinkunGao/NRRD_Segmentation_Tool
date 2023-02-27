type ITemp = {
  name: string;
  masked: boolean;
};

export function findCurrentCase(caseDetail: ITemp[], currentCaseName: string) {
  const result = caseDetail.filter((item) => {
    return item.name === currentCaseName;
  });
  return result[0];
}
