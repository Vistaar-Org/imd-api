import axios from 'axios';
import {
  odishaDistricts,
  uttarPradeshDistricts,
  rajasthanDistricts,
} from 'src/constants/coordinates';

const hitUpTheURLs = async (coordinates) => {
  try {
    const promises = coordinates.map((_) => {
      axios.get(
        `https://imd-api.dev.vistaar.samagra.io/advisory?latitude=${_.latitude}&longitude=${_.longitude}`,
      );
    });

    return await Promise.all(promises);
  } catch (err) {
    console.error('error in hitting the URL');
  }
};

[odishaDistricts, uttarPradeshDistricts, rajasthanDistricts].forEach(
  async (_) => await hitUpTheURLs(_),
);
