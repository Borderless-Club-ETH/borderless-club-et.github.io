export const AUTHORIZED_EMAILS = [
  'bamlakb.woldeyohannes@gmail.com',
  'aynalemassefa.com@gmail.com'
];

export const isAuthorizedCoordinator = (user, userData) => {
  const email = user?.email?.toLowerCase?.() || '';
  const hasCoordinatorFlag = userData?.canPostQuestions === true;
  const isAuthorizedEmail = AUTHORIZED_EMAILS.includes(email);
  return hasCoordinatorFlag || isAuthorizedEmail;
};
