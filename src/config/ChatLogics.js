export const getSender = (loggedUser, users) => {
  return users[0]?._id === loggedUser?._id ? users[1]?.name || users[1]?.userid : users[0]?.name || users[0]?.userid;
};

export const getSenderFull = (loggedUser, users) => {
  return users[0]._id === loggedUser._id ? users[1] : users[0];
};
