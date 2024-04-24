const getUniqueGroupId = (name) => {
  const words = name.split(" ");

  const initials = words
    .map((word) => word[0])
    .join("")
    .toLowerCase();

  const code = Math.floor(1000 + Math.random() * 9000);

  const uniqueId = `${initials}-${code}`;

  return uniqueId;
};

module.exports = { getUniqueGroupId };
